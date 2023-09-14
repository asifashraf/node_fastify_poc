module.exports = function MdlProductFeeds(opts) {

    const { config, baseModel, fs, knexnest, xmlBuilder, mdlCategoryProducts, mdlProducts, i18n } = opts;

    const { languages, cloudfront_url, product_bucket } = config;

    const model = baseModel('products');

    const { link } = model;

    model.processXmlFeeds = function processXmlFeeds(products) {
        const root = xmlBuilder.create('rss', { version: '1.0', encoding: 'UTF-8', standalone: true });
        root.att('xmlns:g', 'http://base.google.com/ns/1.0');

        const channel = root.ele('channel');
        channel.ele('title', 'COFE APP');
        channel.ele('link', 'http://cofemarket.com');

        products.forEach((product) => {
            if (product.productAttributes && product.productAttributes.length > 0) {
                const productAttributes = product.productAttributes;
                productAttributes.forEach((attributes) => {
                    const attItem = channel.ele('item');
                    const attAvailability = (attributes.quantity > 0) ? 'in stock' : 'out of stock';

                    attItem.ele('g:id', attributes.id);
                    attItem.ele('g:title', product.name);
                    attItem.ele('g:description', product.plainDesc);
                    attItem.ele('g:condition', 'New');
                    attItem.ele('g:item_group_id', product.id);
                    attItem.ele('g:availability', attAvailability);
                    attItem.ele('g:price', attributes.finalPrice + ' ' + product.currency);
                    attItem.ele('g:brand', product.manufacturer);
                    attItem.ele('g:status', 'active');

                    // Filter images with cover: false
                    let attrImages = attributes.images;
                    if (attrImages.length > 0) {
                        attItem.ele('g:image_link', attrImages[0].imageUrl);
                    }

                    const filteredImages = attrImages.filter(item => item.imageUrl !== attrImages[0].imageUrl);
                    const imageUrls = filteredImages.map(item => item.imageUrl);

                    if (imageUrls && imageUrls.length > 0) {
                        attItem.ele('g:additional_image_link', imageUrls.toString());
                    }

                    if (attributes.reductionPrice) {
                        attItem.ele('g:sale_price', attributes.reductionPrice.reductionAmount + ' ' + product.currency);
                        attItem.ele('g:sale_price_effective_date', attributes.reductionPrice.from + '/' + product.reductionPrice.to);
                    }

                    const attributesValues = attributes.attributes;
                    const additionalVariantAttributes = attItem.ele('additional_variant_attributes');
                    attributesValues.forEach((attr) => {
                        if (attr.groupType === 'color') {
                            attItem.ele('g:color', attr.attributeName);
                        } else {
                            const additionalAttribute = additionalVariantAttributes.ele('additional_variant_attribute');
                            additionalAttribute.ele('label', attr.attributeGroup);
                            additionalAttribute.ele('value', attr.attributeName);
                        }
                    });

                    attItem.ele('g:rich_text_description', product.description);

                    if (product.fbCategory) {
                        attItem.ele('g:fb_product_category', product.fbCategory);
                        attItem.ele('g:google_product_category', product.googleCategory);
                    }

                    if (product.videos && product.videos.length > 0) {
                        attItem.ele('g:video', product.videos[0].video);
                    }
                });
            } else {
                const item = channel.ele('item');
                const availability = (product.quantity > 0) ? 'in stock' : 'out of stock';

                item.ele('g:id', product.id);
                item.ele('g:title', product.name);
                item.ele('g:description', product.plainDesc);
                item.ele('g:availability', availability);
                item.ele('g:condition', 'New');
                item.ele('g:price', product.finalPrice + ' ' + product.currency);
                item.ele('g:image_link', product.productImage);
                item.ele('g:brand', product.manufacturer);
                item.ele('g:status', 'active');

                if (product.reductionPrice) {
                    item.ele('g:sale_price', product.reductionPrice.reductionAmount + ' ' + product.currency);
                    item.ele('g:sale_price_effective_date', product.reductionPrice.from + '/' + product.reductionPrice.to);
                }

                // Filter images with cover: false
                let images = product.images;
                const filteredImages = images.filter(item => item.cover === false);
                const imageUrls = filteredImages.map(item => item.imageUrl);

                if (imageUrls && imageUrls.length > 0) {
                    item.ele('g:additional_image_link', imageUrls.toString());
                }

                item.ele('g:rich_text_description', product.description);

                if (product.fbCategory) {
                    item.ele('g:fb_product_category', product.fbCategory);
                    item.ele('g:google_product_category', product.googleCategory);
                }

                if (product.videos && product.videos.length > 0) {
                    item.ele('g:video', product.videos[0].video);
                }
            }
        });

        return root.end({ pretty: true });
    };

    model.generateProductXmlFeed = async function generateProductXmlFeed() {
        const countryISOs = ['SA', 'AE', 'KW'];
        const batchSize = 1000; // Define the batch size for pagination
    
        try {
            for (const countryIso of countryISOs) {
                let offset = 0;
                let allProducts = [];
                let products;
    
                do {
                    // Fetch products in batches using pagination
                    products = await this.getProducts(countryIso, batchSize, offset);
                    offset += batchSize;
    
                    allProducts.push(...products);
    
                } while (products.length > 0);
    
                const xmlFeed = await this.processXmlFeeds(allProducts);
                const xmlFilePath = `products_${countryIso}.xml`;
    
                // Use asynchronous file writing to avoid blocking
                fs.writeFile(xmlFilePath, xmlFeed, (err) => {
                    if (err) {
                        console.error(`Error writing XML file for ${countryIso}:`, err);
                    } else {
                        console.log(`XML feed has been saved to ${xmlFilePath}`);
                    }
                });
            }
    
        } catch (error) {
            console.error(error);
            throw new Error(error.message);
        }
    };
      
    model.getProducts = async function getProducts(countryIso, batchSize, offset) {
        const countries = await mdlCategoryProducts.getCountries([countryIso]);
        const vatRate = countries[0].vatRate;
        const currency = countries[0].currency.symbol;
        const locale = languages.en;
    
        const productsQuery = link
            .select(
                'p.id as _id',
                'ps.product_price_tax_excl as _price',
                'ps.id_supplier as _idSupplier',
                'ps.product_supplier_reference as _reference',
                'pm.name as _name',
                'mm.name as _manufacturer',
                'pm.description as _description',
                'pst.quantity as _quantity',
                'fcm.fb_category as _fbCategory',
                'fcm.google_category as _googleCategory',
                'cm.id_category as _categoryId',
                'cm.name as _categoryName',
                'pi.image as _images__image',
                'pi.cover as _images__cover',
                'pv.video as _videos__video'
            )
            .from('products as p')
            .innerJoin('product_metadata as pm', 'p.id', 'pm.id_product')
            .innerJoin('manufacturers_metadata as mm', 'p.id_manufacturer', 'mm.id_manufacturer')
            .innerJoin('product_suppliers as ps', 'p.id', 'ps.id_product')
            .innerJoin('category_metadata as cm', 'p.id_category_default', 'cm.id_category')
            .innerJoin('product_stock as pst', 'p.id', 'pst.id_product')
            .leftJoin('product_countries as pcc', 'p.id', 'pcc.id_product')
            .leftJoin('product_media as pi', 'p.id', 'pi.id_product')
            .leftJoin('product_videos as pv', 'p.id', 'pv.id_product')
            .leftJoin('feeds_category_mapping as fcm', 'p.id_category_default', 'fcm.id_category')    
            .where('pm.id_lang', locale)
            .where('mm.id_lang', locale)
            .where('ps.is_default', true)
            .where('cm.id_lang', locale)
            .where('p.active', true)
            .where('pcc.id_country', countries[0].id)
            .where('p.approval_status', 'Approved')
            .whereNull('p.deleted_at')
            .offset(offset)
            .limit(batchSize);
    
        let result = await productsQuery;

        result = knexnest.nest(result);
    
        if (result && result.length > 0) {
            const products = await Promise.all(result.map(async (item) => {
                
                item.plainDesc = item.description.replace(/<[^>]+>/g, '');
    
                for (const image of item.images) {
                    image.imageUrl = `${cloudfront_url}${product_bucket}${image.image}`;
                }
    
                // Find the object with "cover" set to true
                const coverObject = item.images.find(obj => obj.cover === true);
    
                item.productImage = item.images[0].imageUrl;
    
                // If no cover object found, set the "coverImage" to the "image" of the first index
                if (coverObject) {
                    item.productImage = coverObject.imageUrl;
                }
    
                item.priceTaxExcl = parseFloat(item.price);
    
                item.price = await mdlCategoryProducts.productVatCalculation(item.price, vatRate);
    
                const specificPrice = await mdlCategoryProducts.specificPrice(item, false);
                item.reductionPrice = await mdlCategoryProducts.getProductDiscountedPrice(specificPrice, item.priceTaxExcl, vatRate);
                item.finalPrice = item.price - (item.reductionPrice ? item.reductionPrice.reductionAmount : 0);
                item.finalPrice = parseFloat(item.finalPrice.toFixed(2));
                item.currency = currency;
    
                const attributesQuery = link
                    .where('p.id_product', item.id)
                    .where('p.id_supplier', item.idSupplier)
                    .whereNull('p.deleted_at')
                    .whereNull('pst.deleted_at')
                    .whereNull('pi.deleted_at')
                    .from('product_attributes as p')
                    .innerJoin('product_stock as pst', 'p.id', 'pst.id_product_attribute')
                    .leftJoin('product_attribute_media as pi', 'p.id', 'pi.id_product_attribute')
                    .select('p.id as _id', 'p.id_product as _idProduct', 'p.id_supplier as _idSupplier',
                        'pst.quantity as _quantity', 'p.price as _price', 'p.reference as _reference',
                        'p.default_on as _defaultOn', 'pi.image as _images__image'
                    );

                let attributes = await attributesQuery;

                attributes = knexnest.nest(attributes);
    
                item.productAttributes = [];
    
                if (attributes && attributes.length > 0) {
                    const productAttributes = await mdlProducts.productAttributes(item, attributes, locale, vatRate, false);
                    item = productAttributes.product;
                    item.productAttributes = productAttributes.attributes;
                }
    
                return item;
            }));
    
            return products;
        }
    
        return [];
    };
    
    return model;
}
