module.exports = function MdlProducts(opts) {

    const { config, baseModel, knexnest, guid, constants, httpRequest, mdlCategoryProducts, mdlCategories, i18n, algoliasearch,
        TurndownService, _: { groupBy, every }, mdlManufacturers, slugify } = opts;

    const { default_vat, default_currency, API_URLS } = constants;

    const turndownService = new TurndownService();

    const model = baseModel('products');

    const { languages, default_uuid, cloudfront_url, product_bucket, default_image_url, cartModuleUrl, algoliaAppId,
        algoliaAdminKey, algoliaIndexUae, algoliaIndexKsa, algoliaIndexKwt, supplier_bucket, default_supplier_image,
        manufacturer_bucket, category_bucket, coreModuleUrl } = config;

    const { link } = model;

    model.getAll = async function getAll(filters, pagination, i8ln, fromDashboard) {

        const { locale, countryIso, cofeCustomerToken } = i8ln

        let response = { data: null, pagination: null }

        let countries = await mdlCategoryProducts.getCountries([countryIso]);

        let customerId = null;
        let vatRate = default_vat;
        let currency = default_currency;

        if (countries) {
            vatRate = countries[0].vatRate;
            currency = countries[0].currency.symbol;
        }

        let {
            active,
            id_manufacturer,
            id_product,
            slug_type,
            slug,
            id_category,
            id_subcategory,
            id_supplier,
            keyword,
            sort_by,
            variants,
            features,
            country_iso,
            approval_status,
            offerProducts
        } = filters;

        if (cofeCustomerToken) {
            const customer = await mdlCategoryProducts.autheticateCustomer(cofeCustomerToken);

            if (!customer.data) { return customer; }

            const { id } = customer.data;

            customerId = id;
        }

        let { perPage, currentPage, paginate } = pagination

        if (offerProducts !== undefined) {     

            id_product = await mdlCategoryProducts.getOfferProducts(filters, i8ln);

            if (id_product.length === 0) {

                if (paginate) {

                    let pagination = {
                        total: 0,
                        perPage,
                        currentPage,
                        from: 0,
                        to: 0,
                        lastPage: 0,
                    }
        
                    response.pagination = pagination;
                }

                response.data = [];
                
                return response;
            }

            perPage = 100;
        }

        let categoryId = [];
        let manufacturerIds = [];

        let bindings = [locale, locale, locale];

        let select = `select "p"."id" as "id", "p"."is_varianted" as "variants", "p"."slug", "ps"."product_price_tax_excl" as "price",
            "ps"."product_supplier_reference" as "reference", "ps"."id_supplier" as "idSupplier", "pm"."name" as "name",
            "mm"."name" as "manufacturer", max("pq"."quantity") as "quantity", "pmm"."image" as "image", 
            "smd"."name" as "supplierName", "ofp"."id_offer" as "offerId"`;

        let joins = `inner join "product_metadata" as "pm" on "p"."id" = "pm"."id_product" inner join "product_category" as "pc"
            on "p"."id" = "pc"."id_product" inner join "product_countries" as "pcc" on "p"."id" = "pcc"."id_product"
            inner join "manufacturers_metadata" as "mm" on "p"."id_manufacturer" = "mm"."id_manufacturer"
            inner join "product_suppliers" as "ps" on "p"."id" = "ps"."id_product" inner join "product_stock" as "pq"
            on "p"."id" = "pq"."id_product" left join "product_media" as "pmm" on "p"."id" = "pmm"."id_product"
            inner join "suppliers_metadata" as "smd" on "ps"."id_supplier" = "smd"."id_supplier" left join "offer_products" as "ofp" on "p"."id" = "ofp"."id_product"`;

        let where = `where "pm"."id_lang" = ? and "mm"."id_lang" = ? and "smd"."id_lang" = ?
            and "ps"."is_default" = true and ("pmm"."cover" = true) and "p"."deleted_at" is null`

        let groupBy = `group by "pc"."id_product", "ps"."product_price_tax_excl", "p"."id",
                 "ps"."product_supplier_reference", "ps"."id_supplier", "pm"."name", "mm"."name", "pmm"."image", "smd"."name", "ofp"."id_offer"`

        if (customerId) {
            select = `${select}, "pw"."id" as "wishedId"`;

            joins = `${joins} left outer join "products_wishlist" as "pw" on "p"."id" = "pw"."id_product"
            and "pw"."id_customer" = '${customerId}'`;

            groupBy = `${groupBy}, "pw"."id"`;
        }

        if (fromDashboard) {

            if (country_iso) {

                let filteredCountry = await mdlCategoryProducts.getCountries([country_iso]);

                let idCountry = null

                if (filteredCountry) idCountry = filteredCountry[0].id;

                where = `${where} and "pcc"."id_country" = ?`;

                bindings.push(idCountry);
            }

            select = `${select}, "p"."active" as "status", 
            "cm"."name" as "categoryName", ARRAY_AGG(pcc.country_name) as countries`;

            joins = `${joins} inner join "category_metadata" as "cm" on "p"."id_category_default" = "cm"."id_category"`;

            where = `${where} and "cm"."id_lang" = ? and smd.id_lang = ?`;

            bindings.push(locale, locale);

            if (keyword) {
                where = `${where} and ("pm"."name" ilike ? or "p"."reference" ilike ?)`;

                bindings.push(`%${keyword}%`, `%${keyword}%`);
            }

            if (variants !== undefined) {
                where = `${where} and "p"."is_varianted" = ?`;
                bindings.push(variants);
            }

            if (approval_status !== undefined) {
                where = `${where} and "p"."approval_status" = ?`;
                bindings.push(approval_status);
            }

            groupBy = `${groupBy}, "cm"."name"`;
        }

        select = `${select} from "products" as "p"`;

        if (slug_type) {

            if (slug_type === 'category') {

                const slugCategories = await mdlCategories.getCategoriesBySlug(slug)

                if (slugCategories.parentCategory === null && slugCategories.subCategory?.length === 0) {

                    if (paginate) {

                        let pagination = {
                            total: 0,
                            perPage,
                            currentPage,
                            from: 0,
                            to: 0,
                            lastPage: 0,
                        }
            
                        response.pagination = pagination;
                    }
    
                    response.data = [];
                    
                    return response;
                } 

                if (slugCategories.parentCategory !== null) {
                    categoryId.push(slugCategories.parentCategory)
                }

                if (slugCategories.subCategory.length > 0) {
                    categoryId = slugCategories.subCategory;
                }

            } else if (slug_type === 'manufacturer') {
                
                const slugManufacturer = await mdlManufacturers.getManufacturerBySlug(slug)

                if (slugManufacturer.id_manufacturer?.length === 0) {

                    if (paginate) {

                        let pagination = {
                            total: 0,
                            perPage,
                            currentPage,
                            from: 0,
                            to: 0,
                            lastPage: 0,
                        }
            
                        response.pagination = pagination;
                    }
    
                    response.data = [];
                    
                    return response;
                }

                if (slugManufacturer.id_manufacturer.length > 0) {
                    manufacturerIds = slugManufacturer.id_manufacturer
                }
            }
        }

        if (id_manufacturer?.length) {
            manufacturerIds = id_manufacturer
        }

        if (manufacturerIds?.length) {
            where = `${where} and "p"."id_manufacturer" in (${manufacturerIds.map(_ => '?').join(',')})`;
            bindings.push(...manufacturerIds);
        }

        if (id_category) categoryId.push(id_category)

        if (id_subcategory?.length) categoryId = id_subcategory

        if (categoryId?.length) {
            where = `${where} and "pc"."id_category" in (${categoryId.map(_ => '?').join(',')})`;
            bindings.push(...categoryId);
        }

        if (id_supplier) {
            where = `${where} and "ps"."id_supplier" = ?`;
            bindings.push(id_supplier);
        }

        if (id_product?.length) {
            where = `${where} and "p"."id" in (${id_product.map(_ => '?').join(',')})`;
            bindings.push(...id_product);
        }
        
        if (active !== undefined) {
            where = `${where} and "p"."active" = ?`;
            bindings.push(active);
        }

        let country_id = null

        if (countries) country_id = countries[0].id;

        if (!fromDashboard) {
            where = `${where} and "pcc"."id_country" = ? and "p"."approval_status" = 'Approved'`;
            bindings.push(country_id);
        }

        if (features && features.length > 0) {

            if (id_category) {
                groupBy = `${groupBy}, "pc"."position"`;
            }

            let query1 = `${select} ${joins} ${where} ${groupBy}`;

            let _link = link.raw(query1, bindings);

            let pIds = await _link;

            let result = pIds.rows.map(({ id }) => id)

            let featuredProducts = await mdlCategoryProducts.getProductsByFeatures(result, features);

            if (featuredProducts.length > 0) {
                where = `${where} and "pc"."id_product" in (${featuredProducts.map(_ => '?').join(',')})`;
            }

            bindings.push(...featuredProducts);
        }

        if (id_category)
            groupBy = `${groupBy}, "pc"."position"`;

        let query = `${select} ${joins} ${where} ${groupBy}`

        if (sort_by) {
            if (sort_by.name) {
                query = `${query} order by "pm"."name" ${sort_by.name}`;
            }

            if (sort_by.price) {
                query = `${query} order by "ps"."product_price_tax_excl" ${sort_by.price}`;
            }

            if (sort_by.newest) {
                query = `${query} order by "p"."created_at" ${sort_by.newest}`;
            }
        } else if (fromDashboard) {
            query = `${query} order by "p"."created_at" desc`;
        } else {
            if (id_category)
                query = `${query} order by "pc"."position" asc`;
            else
                query = `${query} order by "p"."position" asc`;
        }

        if (filters.price && filters.price.min_price && filters.price.max_price)
            perPage = 100;

        let _link = await link.raw(query, bindings);
        response.data = _link.rows;

        if (paginate) {

            let offset = (currentPage - 1) * perPage
            query = `${query} LIMIT ${perPage} offset ${offset}`;

            let totalProducts = response.data.length;

            let result = await link.raw(query, bindings);

            let pagination = {
                total: totalProducts,
                perPage,
                currentPage,
                from: offset,
                to: offset + _link.rowCount,
                lastPage: Math.ceil(totalProducts / perPage),
            }

            response.data = result.rows;
            response.pagination = pagination;
        }

        let products = response.data;

        if (fromDashboard) {
            products.forEach(product => product.countries = [...new Set(product.countries)])
        }

        if (products && products.length > 0) {

            let _products = products.map(async (item) => {

                item.isWished = false;

                if (customerId) {
                    if (item.wishedId)
                        item.isWished = true;
                }

                delete item.wishedId;

                item.productImage = default_image_url;

                if (item.image)
                    item.productImage = `${cloudfront_url}${product_bucket}${item.image}`

                delete item.image;

                item.offer = null;

                if (item.offerId) {
                    item.offer = await mdlCategoryProducts.getProductOffer(item.id, locale);
                }

                delete item.offerId;

                item.priceTaxExcl = item.price;

                item.priceTaxExcl = parseFloat(item.priceTaxExcl);

                item.price = await mdlCategoryProducts.productVatCalculation(item.price, vatRate)

                let specificPrice = await mdlCategoryProducts.specificPrice(item)

                item.reductionPrice = await mdlCategoryProducts.getProductDiscountedPrice(specificPrice, item.priceTaxExcl, vatRate);

                let reductionAmount = (item.reductionPrice) ? item.reductionPrice.reductionAmount : 0;

                let reductionAmountTaxExcl = (item.reductionPrice) ? item.reductionPrice.reductionAmountTaxExcl : 0;

                item.priceTaxExcl = item.priceTaxExcl - reductionAmountTaxExcl;

                item.finalPrice = item.price - reductionAmount;

                item.finalPrice = item.finalPrice.toFixed(2);

                item.finalPrice = parseFloat(item.finalPrice);

                item.currency = currency;

                let _checkAttributes = link
                    .where('p.id_product', item.id)
                    .where('p.id_supplier', item.idSupplier)
                    .whereNull('p.deleted_at')
                    .whereNull('pst.deleted_at')
                    .whereNull('pi.deleted_at')
                    .from('product_attributes as p')
                    .innerJoin('product_stock as pst', 'p.id', 'pst.id_product_attribute')
                    .leftJoin('product_attribute_media as pi', 'p.id', 'pi.id_product_attribute')
                    .select('p.id as _id', 'p.id_product as _idProduct', 'p.id_supplier as _idSupplier',
                        'pst.quantity as _quantity', 'pst.allow_backorder as _allowBackOrder',
                        'p.price as _price', 'p.reference as _reference', 'p.default_on as _defaultOn',
                        'pi.image as _images__image',
                    )

                let attributes = await _checkAttributes;

                attributes = knexnest.nest(attributes);

                if (attributes && attributes.length > 0) {
                    let productAttributes = await this.productAttributes(item, attributes, locale, vatRate, fromDashboard)
                    item = productAttributes.product;
                    delete item.images;
                    delete item.availbleForOrder;
                    delete item.allowBackOrder;
                }

                return item;
            })

            products = await Promise.all(_products);

            if (filters.price && filters.price.min_price && filters.price.max_price) {
                response.data = products.filter(item =>
                    item.finalPrice <= filters.price.max_price &&
                    item.finalPrice >= filters.price.min_price
                );

                if (paginate) {
                    response.pagination.total = response.data?.length || 0
                    response.pagination.to = response.data?.length || 0
                    response.pagination.lastPage = currentPage
                }
            }

            if (sort_by) {
                if (sort_by.price) {
                    if (sort_by.price === 'Asc') {
                        response.data = response.data.sort(
                            (p1, p2) => (p1.finalPrice > p2.finalPrice) ? 1 : (p1.finalPrice < p2.finalPrice) ? -1 : 0);
                    } else {
                        response.data = response.data.sort(
                            (p1, p2) => (p1.finalPrice < p2.finalPrice) ? 1 : (p1.finalPrice > p2.finalPrice) ? -1 : 0);
                    }
                }
            } 
            
            if (offerProducts !== undefined && sort_by === undefined) {
                response.data = response.data.sort(
                   (p1, p2) => (p1.offer === null && p2.offer !== null) ? 1 : 
                   (p1.offer !== null && p2.offer === null) ? -1 :
                   (p1.offer?.dateFrom > p2.offer?.dateFrom) ? 1 :
                   (p1.offer?.dateFrom < p2.offer?.dateFrom) ? -1 : 0
                );
            }
        }

        return response
    }

    model.createProduct = async function createProduct(product) {

        const {
            reference,
            id_manufacturer,
            id_category,
            name,
            short_description,
            name_ar,
            short_description_ar,
            description,
            description_ar,
            id_supplier,
            priceTaxExcl: price,
            quantity,
            features,
            images,
            videos,
            tags,
            countries,
            variants,
            reductionPrice,
            approval_status
        } = product;

        const productSlug = slugify(name, { lower: true });

        const itExists = await this.doesExist((builder) => {
            builder.where('deleted_at', null);
            builder.where((innerBuilder) => {
                innerBuilder
                    .where({ reference })
            })
        })

        if (itExists) {
            throw new Error(`product_already_exists`)
        }

        let selectedCountries = await mdlCategoryProducts.getCountries();

        if (countries?.length) {
            selectedCountries = selectedCountries.filter(item => countries.includes(item.id))

            if (!selectedCountries?.length) {
                throw new Error(`country_not_exists`)
            }
        }

        const [insertId] = await link('products').insert({
            id: guid.v4(),
            id_manufacturer: id_manufacturer,
            reference: reference,
            id_category_default: id_category,
            is_varianted: variants?.length ? true : false,
            approval_status,
            slug: productSlug
        }, 'id');

        const { id } = insertId;

        let categories = [id_category];

        let _link = link('categories').select('c.id_parent as _parentId').from('categories as c')
            .where('id', id_category).first()

        let result = await _link;

        if (result && typeof result && result._parentId != default_uuid)
            categories.push(result._parentId);

        for (const category of categories) {
            await link('product_category').insert({
                id_product: id, id_category: category, position: 0
            })
        }

        const productMetaData = await link('product_metadata').insert([
            {
                id: guid.v4(),
                id_product: id,
                name: name,
                id_lang: languages.en,
                short_description,
                description,
                markdown_desc: (description) ? turndownService.turndown(description) : null,
                markdown_short: (short_description) ? turndownService.turndown(short_description) : null
            },
            {
                id: guid.v4(),
                id_product: id,
                name: name_ar,
                id_lang: languages.ar,
                short_description: short_description_ar,
                description: description_ar,
                markdown_desc: (description_ar) ? turndownService.turndown(description_ar) : null,
                markdown_short: (short_description_ar) ? turndownService.turndown(short_description_ar) : null
            },
        ], '*')

        await link('product_suppliers').insert({
            id: guid.v4(),
            id_product: id,
            id_product_attribute: default_uuid,
            id_supplier: id_supplier,
            product_supplier_reference: reference,
            product_price_tax_excl: price,
            is_default: 1,
            active: 1
        }, '*')

        await link('product_stock').insert({
            id: guid.v4(),
            id_product: id,
            id_product_attribute: default_uuid,
            id_supplier: id_supplier,
            quantity: quantity,
        }, '*')

        if (features?.length > 0) {

            const productFeatures = [];
            for (const feature of features) {
                let id_feature_value = feature.id_feature_value

                if (!guid.validate(id_feature_value)) {
                    const [insertId] = await link('feature_values').insert({
                        id: guid.v4(),
                        id_feature: feature.id_feature,
                    }, 'id');

                    await link('feature_values_metadata').insert([
                        { id: guid.v4(), id_feature_value: insertId.id, name: id_feature_value, id_lang: languages.en },
                        { id: guid.v4(), id_feature_value: insertId.id, name: id_feature_value, id_lang: languages.ar },
                    ], '*');

                    id_feature_value = insertId.id;

                    productFeatures.push({
                        id_product: id,
                        id_feature: feature.id_feature,
                        id_feature_group: feature.id_feature_group,
                        id_feature_value,
                    })
                } else {
                    productFeatures.push({
                        id_product: id,
                        id_feature: feature.id_feature,
                        id_feature_group: feature.id_feature_group,
                        id_feature_value,
                    })
                }
            }

            await link('product_features').insert(productFeatures)
        }

        if (images && images.length > 0) {

            for (const image of images) {
                await link('product_media').insert({
                    id: guid.v4(),
                    id_product: id,
                    position: image.position,
                    cover: image.cover,
                    alternate_cover: image.alternate_cover,
                    image: image.image
                }, '*')
            }
        }

        if (videos?.length > 0) {
            for (const video of videos) {
                await link('product_videos').insert({
                    id: guid.v4(),
                    id_product: id,
                    video,
                })
            }
        }

        if (tags?.length > 0) {
            let productTags = []
            for (const tag of tags) {
                const [currentTag] = await link('tags').insert({
                    id: guid.v4(),
                    id_lang: languages.en,
                    name: tag,
                    created_at: this.now(),
                    updated_at: this.now(),
                })
                    .onConflict(['id_lang', 'name'])
                    .merge({
                        name: tag,
                        id_lang: languages.en,
                        updated_at: this.now(),
                        deleted_at: null,
                    })
                    .returning(['id']);

                productTags.push(currentTag)
            }

            productTags = productTags.map((tag) => {
                return {
                    id_tag: tag.id,
                    id_product: id,
                }
            })

            await link('product_tags').insert(productTags)
        }

        if (selectedCountries && selectedCountries.length > 0) {
            for (const country of selectedCountries) {
                await link('product_countries').insert({
                    id_product: id,
                    id_country: country.id,
                    country_name: country.name,
                })
            }
        }

        if (variants?.length) {

            const attributeImages = []
            const productAttributeCombinations = []
            const productStocks = []
            const productVariantsReduction = []

            const productAttributes = variants.map((variant) => {

                const attributeId = guid.v4()

                productStocks.push({
                    id: guid.v4(),
                    id_product: id,
                    id_product_attribute: attributeId,
                    id_supplier: id_supplier,
                    quantity: variant.quantity,
                    allow_backorder: variant.allow_backorder,
                    updated_at: this.now(),
                })

                if (variant.reductionPrice) {
                    productVariantsReduction.push({
                        reductionPrice: variant.reductionPrice,
                        attributeId,
                        variantPrice: variant.price
                    })
                }

                if (variant.images?.length) {
                    attributeImages.push({ id: attributeId, images: variant.images })
                }

                if (variant.id_attributes?.length) {
                    for (let index = 0; index < variant.id_attributes.length; index++) {
                        const attribute = variant.id_attributes[index];

                        productAttributeCombinations.push({
                            id_product_attribute: attributeId,
                            id_attribute: attribute,
                        })
                    }
                }

                return {
                    id: attributeId,
                    id_product: id,
                    reference: variant.reference,
                    price: variant.price,
                    default_on: variant.default,
                    id_supplier,
                }
            })

            const productAttributeMedia = []

            if (attributeImages.length) {
                for (let index = 0; index < attributeImages.length; index++) {
                    const attributeImgs = attributeImages[index].images;

                    if (attributeImgs.length) {
                        for (let innerIndex = 0; innerIndex < attributeImgs.length; innerIndex++) {
                            productAttributeMedia.push({ id_product_attribute: attributeImages[index].id, image: attributeImgs[innerIndex] })
                        }
                    }
                }
            }

            if (every(productAttributes, ['default_on', false])) {
                productAttributes[0].default_on = true
            }

            await link('product_attributes').insert(productAttributes)

            for (let index = 0; index < productVariantsReduction.length; index++) {
                const variantReduction = productVariantsReduction[index];

                const reduction = variantReduction.reductionPrice

                let variantReductPercentage = reduction.reductionValue;

                if (reduction.reductionType === 'percentage') {
                    reduction.reductionValue = reduction.reductionValue / 100;
                    variantReductPercentage = reduction.reductionValue;
                } else {

                    let totalPrice = price+variantReduction.variantPrice;

                    variantReductPercentage = reduction.reductionValue/totalPrice;
                    variantReductPercentage = variantReductPercentage.toFixed(4);
                }  

                await link('product_specific_price').insert({
                    id: guid.v4(),
                    id_cart: default_uuid,
                    id_product: id,
                    id_product_attribute: variantReduction.attributeId,
                    id_supplier,
                    id_country: (selectedCountries && selectedCountries.length > 0) ? selectedCountries[0].id : default_uuid,
                    id_currency: default_uuid,
                    id_customer: default_uuid,
                    reduction: reduction.reductionValue,
                    reduction_type: reduction.reductionType,
                    reduction_percentage: variantReductPercentage,
                    date_from: reduction.from,
                    date_to: reduction.to,
                    active: reduction.active,
                    created_at: this.now(),
                    updated_at: this.now(),
                })
            }

            if (productAttributeCombinations.length) {
                await link('product_attribute_combinations').insert(productAttributeCombinations)
            }

            if (productAttributeMedia.length) {
                await link('product_attribute_media').insert(productAttributeMedia)
            }

            await link('product_stock').insert(productStocks)
        }

        if (reductionPrice) {

            let reductionPercentage = reductionPrice.reductionValue;

            if (reductionPrice.reductionType === 'percentage') {
                reductionPrice.reductionValue = reductionPrice.reductionValue / 100;
                reductionPercentage = reductionPrice.reductionValue;
            } else {
                reductionPercentage = reductionPrice.reductionValue/price;
                reductionPercentage = reductionPercentage.toFixed(4);
            }    

            await link('product_specific_price').insert({
                id: guid.v4(),
                id_cart: default_uuid,
                id_product: id,
                id_product_attribute: default_uuid,
                id_supplier,
                id_country: (selectedCountries && selectedCountries.length > 0) ? selectedCountries[0].id : default_uuid,
                id_currency: default_uuid,
                id_customer: default_uuid,
                reduction: reductionPrice.reductionValue,
                reduction_type: reductionPrice.reductionType,
                reduction_percentage: reductionPercentage,
                date_from: reductionPrice.from,
                date_to: reductionPrice.to,
                active: reductionPrice.active,
                created_at: this.now(),
                updated_at: this.now(),
            })
        }

        await this.productToAlgolia([id])

        return { data: { product_id: id, product_metadata: productMetaData, images } };
    }

    model.updateProduct = async function updateProduct(product) {

        const {
            id: productId,
            reference,
            id_manufacturer,
            id_category,
            name,
            active,
            short_description,
            description,
            priceTaxExcl: price,
            quantity,
            features,
            images,
            videos,
            tags,
            countries,
            reductionPrice,
            variants,
            name_ar,
            short_description_ar,
            description_ar,
            approval_status
        } = product;

        let { id_supplier } = product

        if (reference) {
            const itExists = await this.doesExist((builder) => {
                builder.where('deleted_at', null);
                builder.where((innerBuilder) => {
                    innerBuilder
                        .where({ reference })
                })
            })

            if (itExists && itExists.id !== productId) {
                throw new Error(`product_already_exists`)
            }
        }

        // category update
        if (id_category) {
            const categories = [id_category]

            const category = await link('categories')
                .select('c.id_parent as _parentId')
                .from('categories as c')
                .where('id', id_category)
                .first()

            if (!category)
                throw new Error(`category_not_exists`)

            if (category?._parentId !== default_uuid)
                categories.push(category._parentId);

            if (categories?.length) {
                await link('product_category')
                    .del()
                    .where({ id_product: productId })

                for (const category of categories) {
                    await link('product_category').insert({
                        id_product: productId, id_category: category, position: 0
                    })
                }
            }
        }

        // countries validation check
        let selectedCountries = null

        if (countries?.length) {
            selectedCountries = await mdlCategoryProducts.getCountries();

            selectedCountries = selectedCountries.filter(item => countries.includes(item.id))

            if (!selectedCountries?.length) {
                throw new Error(`country_not_exists`)
            }
        }

        // product update
        const productKeys = [
            'reference',
            'id_manufacturer',
            'id_category',
            'active',
            'approval_status',
            'name'
        ]

        let toUpdate = false;

        for (key of productKeys) {
            if (product.hasOwnProperty(key)) {
                toUpdate = true
                break
            }
        }

        if (toUpdate) {

            const updatedFields = { 
                reference,
                id_manufacturer,
                id_category_default: id_category,
                active,
                approval_status,
                updated_at: this.now() 
            }

            if (name) {
                updatedFields.slug = slugify(name, { lower: true });
            }

            const [updatedProduct] = await this.update(updatedFields, {
                id: productId,
                deleted_at: null
            });

            if (!updatedProduct)
                throw new Error(`product_not_exists`)

            toUpdate = false
        }

        // product update
        const metaKeys = [
            'short_description',
            'name',
            'description',
            'name_ar',
            'short_description_ar',
            'description_ar',
        ]

        for (key of metaKeys) {
            if (product.hasOwnProperty(key)) {
                toUpdate = true
                break
            }
        }

        // product meta update
        const productMetaData = [];

        if (toUpdate) {

            if (short_description || name || description) {

                let markdown_desc = null;
                let markdown_short = null;

                if (description)
                    markdown_desc = turndownService.turndown(description)

                if (short_description)
                    markdown_short = turndownService.turndown(short_description)

                const [updatedMeta] = await link('product_metadata')
                    .update({ short_description, name, description, markdown_desc, markdown_short })
                    .where({ id_product: productId, id_lang: languages.en })
                    .returning('*')

                productMetaData.push(updatedMeta)
            }

            if (short_description_ar || name_ar || description_ar) {

                let markdown_desc = null;
                let markdown_short = null;

                if (description_ar)
                    markdown_desc = turndownService.turndown(description_ar)

                if (short_description_ar)
                    markdown_short = turndownService.turndown(short_description_ar)

                const [updatedMeta] = await link('product_metadata')
                    .update({ short_description: short_description_ar, name: name_ar, description: description_ar, markdown_desc, markdown_short })
                    .where({ id_product: productId, id_lang: languages.ar })
                    .returning('*')

                productMetaData.push(updatedMeta)
            }

            toUpdate = false

        } else {
            const productMeta = await link('product_metadata')
                .where({ id_product: productId })
                .returning('*')

            productMetaData.push(...productMeta)
        }

        // supplier update
        if (id_supplier) {
            const supplier = await link('suppliers')
                .select('s.id as _supplierId')
                .from('suppliers as s')
                .where('id', id_supplier)
                .first()

            if (!supplier?._supplierId)
                throw new Error(`supplier_not_exists`)

            await link('product_suppliers')
                .update({
                    id_product_attribute: default_uuid,
                    id_supplier,
                    product_supplier_reference: reference,
                    product_price_tax_excl: price,
                    is_default: 1,
                    active: 1
                })
                .where({ id_product: productId })
        } else {
            const productSupplier = await link('product_suppliers')
                .select('s.id as id')
                .from('product_suppliers as s')
                .where('id_product', productId)
                .first()

            if (productSupplier) {
                id_supplier = productSupplier.id
            }
        }

        // stock update
        if (quantity !== undefined) {
            await link('product_stock')
                .update({
                    id_supplier,
                    quantity,
                })
                .where({ id_product: productId, id_product_attribute: default_uuid })
        }

        await link('product_features').del().where({ id_product: productId })

        if (features && features.length > 0) {
            for (const feature of features) {
                let id_feature_value = feature.id_feature_value

                if (!guid.validate(feature.id_feature_value)) {
                    const [insertId] = await link('feature_values').insert({
                        id: guid.v4(),
                        id_feature: feature.id_feature,
                    }, 'id');

                    await link('feature_values_metadata').insert([
                        { id: guid.v4(), id_feature_value: insertId.id, name: id_feature_value, id_lang: languages.en },
                        { id: guid.v4(), id_feature_value: insertId.id, name: id_feature_value, id_lang: languages.ar },
                    ], '*');

                    id_feature_value = insertId.id;
                }

                await link('product_features').insert({
                    id_product: productId,
                    id_feature: feature.id_feature,
                    id_feature_group: feature.id_feature_group,
                    id_feature_value,
                })
            }
        }

        // country section
        if (selectedCountries && selectedCountries.length > 0) {
            await link('product_countries')
                .del()
                .where({ id_product: productId })

            for (const country of selectedCountries) {
                await link('product_countries').insert({
                    id_product: productId,
                    id_country: country.id,
                    country_name: country.name,
                })
            }
        }

        // image section
        if (images) {
            await link('product_media')
                .del()
                .where({ id_product: productId })

            if (images.length > 0) {
                for (const image of images) {
                    await link('product_media').insert({
                        id: guid.v4(),
                        id_product: productId,
                        position: image.position,
                        cover: image.cover,
                        alternate_cover: image.alternate_cover,
                        image: image.image
                    })
                }
            }
        }

        // videos section
        if (videos) {
            await link('product_videos')
                .del()
                .where({ id_product: productId })

            if (videos.length > 0) {
                for (const video of videos) {
                    await link('product_videos').insert({
                        id: guid.v4(),
                        id_product: productId,
                        video,
                    })
                }
            }
        }

        if (tags) {
            await link('product_tags')
                .del()
                .where({
                    id_product: productId,
                })

            if (tags.length > 0) {
                let productTags = []

                for (const tag of tags) {
                    const [currentTag] = await link('tags').insert({
                        id: guid.v4(),
                        id_lang: languages.en,
                        name: tag,
                        created_at: this.now(),
                        updated_at: this.now(),
                    })
                        .onConflict(['id_lang', 'name'])
                        .merge({
                            name: tag,
                            id_lang: languages.en,
                            updated_at: this.now(),
                            deleted_at: null,
                        })
                        .returning(['id']);

                    productTags.push(currentTag)
                }

                productTags = productTags.map((tag) => {
                    return {
                        id_tag: tag.id,
                        id_product: productId,
                    }
                })

                await link('product_tags').insert(productTags)
            }
        }

        if (reductionPrice === null) {
            await link('product_specific_price')
                .del()
                .where('id_product', productId)
                .andWhere('id_product_attribute', default_uuid)

        } else if (reductionPrice) {
            await link('product_specific_price')
                .del()
                .where('id_product', productId)
                .andWhere('id_product_attribute', default_uuid)

            let reductionPercentage = reductionPrice.reductionValue;

            if (reductionPrice.reductionType === 'percentage') {
                reductionPrice.reductionValue = reductionPrice.reductionValue / 100;
                reductionPercentage = reductionPrice.reductionValue;
            } else {
                reductionPercentage = reductionPrice.reductionValue/price;
                reductionPercentage = reductionPercentage.toFixed(4);
            }  

            await link('product_specific_price').insert({
                id: guid.v4(),
                id_cart: default_uuid,
                id_product: productId,
                id_product_attribute: default_uuid,
                id_supplier,
                id_country: (selectedCountries && selectedCountries.length > 0) ? selectedCountries[0].id : default_uuid,
                id_currency: default_uuid,
                id_customer: default_uuid,
                reduction: reductionPrice.reductionValue,
                reduction_type: reductionPrice.reductionType,
                reduction_percentage: reductionPercentage,
                date_from: reductionPrice.from,
                date_to: reductionPrice.to,
                active: reductionPrice.active,
                created_at: this.now(),
                updated_at: this.now(),
            })
        }

        if (variants) {
            if (!variants.length) {
                const now = this.now()

                await link('product_attributes')
                    .update({
                        deleted_at: now
                    })
                    .where('id_product', productId)

                await link('product_stock')
                    .update({
                        deleted_at: now
                    })
                    .where('id_product', productId)
                    .whereNotIn('id_product_attribute', [default_uuid])

                await link('product_specific_price')
                    .update({
                        deleted_at: now
                    })
                    .where('id_product', productId)
                    .whereNotIn('id_product_attribute', [default_uuid])

                await this.update({
                        is_varianted: false,
                        updated_at: now
                    },
                    {
                        id: productId,
                        deleted_at: null
                    });

            } else {

                const attributeImages = []
                const productAttributeCombinations = []
                const productStocks = []
                const productVariantsReduction = []
                const attributesToUpdate = []
                const attributesToDelete = []
                const toDelete = []

                let productAttributes = variants.map((variant) => {

                    if (!variant.id) {
                        const attributeId = guid.v4()

                        productStocks.push({
                            id: guid.v4(),
                            id_product: productId,
                            id_product_attribute: attributeId,
                            id_supplier,
                            quantity: variant.quantity,
                            allow_backorder: variant.allow_backorder,
                            updated_at: this.now(),
                        })

                        if (variant.reductionPrice) {
                            productVariantsReduction.push({
                                reductionPrice: variant.reductionPrice,
                                attributeId,
                                variantPrice: variant.price
                            })
                        }

                        if (variant.images?.length) {
                            attributeImages.push({ id: attributeId, images: variant.images })
                        }

                        // variant combinations
                        if (variant.id_attributes?.length) {
                            for (let index = 0; index < variant.id_attributes.length; index++) {
                                const attribute = variant.id_attributes[index];

                                productAttributeCombinations.push({
                                    id_product_attribute: attributeId,
                                    id_attribute: attribute,
                                })
                            }
                        }

                        return {
                            id: attributeId,
                            id_product: productId,
                            reference: variant.reference,
                            price: variant.price,
                            default_on: variant.default,
                            id_supplier,
                        }

                    } else {

                        toDelete.push(variant.id)

                        if (!variant.delete) {
                            attributesToUpdate.push({
                                reference: variant.reference,
                                price: variant.price,
                                default: variant.default,
                                id_supplier,
                                id: variant.id,
                            })

                            productStocks.push({
                                id: guid.v4(),
                                id_product: productId,
                                id_product_attribute: variant.id,
                                id_supplier,
                                quantity: variant.quantity,
                                allow_backorder: variant.allow_backorder,
                            })

                            if (variant.images?.length) {
                                attributeImages.push({ id: variant.id, images: variant.images })
                            }

                            // variant combinations
                            if (variant.id_attributes?.length) {
                                for (let index = 0; index < variant.id_attributes.length; index++) {
                                    const attribute = variant.id_attributes[index];

                                    productAttributeCombinations.push({
                                        id_product_attribute: variant.id,
                                        id_attribute: attribute,
                                    })
                                }
                            }

                            if (variant.reductionPrice) {
                                productVariantsReduction.push({
                                    reductionPrice: variant.reductionPrice,
                                    attributeId: variant.id,
                                    variantPrice: variant.price
                                })
                            }
                        } else {
                            attributesToDelete.push(variant.id)
                        }
                    }

                })

                if (toDelete.length) {
                    const now = this.now()

                    await link('product_attribute_combinations')
                        .update({
                            deleted_at: now,
                        })
                        .whereIn('id_product_attribute', toDelete)

                    await link('product_attribute_media')
                        .update({
                            deleted_at: now,
                        })
                        .whereIn('id_product_attribute', toDelete)

                    await link('product_specific_price')
                        .update({
                            deleted_at: now,
                        })
                        .where('id_product', productId)
                        .whereIn('id_product_attribute', toDelete)

                    await link('product_stock')
                        .update({
                            deleted_at: now,
                        })
                        .where('id_product', productId)
                        .whereIn('id_product_attribute', toDelete)
                }

                if (attributesToDelete.length) {
                    const now = this.now()

                    await link('product_attributes')
                        .update({
                            deleted_at: now,
                        })
                        .where('id_product', productId)
                        .whereIn('id', attributesToDelete)

                    await link('product_stock')
                        .update({
                            deleted_at: now,
                        })
                        .where('id_product', productId)
                        .whereIn('id_product_attribute', attributesToDelete)
                }

                if (attributesToUpdate.length) {
                    for (let index = 0; index < attributesToUpdate.length; index++) {
                        const attr = attributesToUpdate[index];

                        await link('product_attributes')
                            .update({
                                reference: attr.reference,
                                price: attr.price,
                                default_on: attr.default,
                                id_supplier: attr.id_supplier
                            })
                            .where({ id_product: productId, id: attr.id })
                    }
                }

                const productAttributeMedia = []
                if (attributeImages.length) {
                    for (let index = 0; index < attributeImages.length; index++) {
                        const attributeImgs = attributeImages[index].images;

                        if (attributeImgs.length) {
                            for (let innerIndex = 0; innerIndex < attributeImgs.length; innerIndex++) {
                                productAttributeMedia.push({ id_product_attribute: attributeImages[index].id, image: attributeImgs[innerIndex] })
                            }
                        }
                    }
                }

                productAttributes = productAttributes.filter((attr) => attr)

                if (productAttributes.length) {
                    await link('product_attributes').insert(productAttributes)
                }

                if (productAttributeCombinations.length) {
                    await link('product_attribute_combinations').insert(productAttributeCombinations)
                }

                if (productAttributeMedia.length) {
                    await link('product_attribute_media').insert(productAttributeMedia)
                }

                if (productVariantsReduction.length) {
                    for (let index = 0; index < productVariantsReduction.length; index++) {
                        const variantReduction = productVariantsReduction[index];

                        const reduction = variantReduction.reductionPrice

                        let variantReductPercentage = reduction.reductionValue;

                        if (reduction.reductionType === 'percentage') {
                            reduction.reductionValue = reduction.reductionValue / 100;
                            variantReductPercentage = reduction.reductionValue;
                        } else {

                            let totalPrice = price+variantReduction.variantPrice;

                            variantReductPercentage = reduction.reductionValue/totalPrice;
                            variantReductPercentage = variantReductPercentage.toFixed(4);
                        }  

                        await link('product_specific_price').insert({
                            id: guid.v4(),
                            id_cart: default_uuid,
                            id_product: productId,
                            id_product_attribute: variantReduction.attributeId,
                            id_supplier,
                            id_country: (selectedCountries && selectedCountries.length > 0) ? selectedCountries[0].id : default_uuid,
                            id_currency: default_uuid,
                            id_customer: default_uuid,
                            reduction: reduction.reductionValue,
                            reduction_type: reduction.reductionType,
                            reduction_percentage: variantReductPercentage,
                            date_from: reduction.from,
                            date_to: reduction.to,
                            active: reduction.active,
                            created_at: this.now(),
                            updated_at: this.now(),
                        })
                    }
                }

                if (productStocks.length) {
                    for (const stock of productStocks) {
                        await link('product_stock').insert(stock)
                            .onConflict(['id_product','id_product_attribute'])
                            .merge({
                                quantity: stock.quantity,
                                updated_at: this.now(),
                                deleted_at: null,
                            })
                    }
                }

                await this.update({
                    is_varianted: true,
                    updated_at: this.now()
                },
                {
                    id: productId,
                    deleted_at: null
                });
            }
        }

        if (active !== undefined && active === false) {
            await this.deleteProduct(productId, true)
        } else {
            await this.productToAlgolia([productId])
        }

        return { data: { product_id: productId, product_metadata: productMetaData, images } };
    }

    model.deleteProduct = async function deleteProduct(id, statusOnly = false) {

        const client = algoliasearch(algoliaAppId, algoliaAdminKey);
        const uaeIndex = client.initIndex(algoliaIndexUae);
        const ksaIndex = client.initIndex(algoliaIndexKsa);
        const kwtIndex = client.initIndex(algoliaIndexKwt);

        const itExists = await link('products')
            .where('id', id)
            .first('id')

        if (!itExists) { throw new Error(`invalid_product`) }

        if (statusOnly === false) {
            await this.softDelete(
                { id },
                { active: false }
            );
        }

        await uaeIndex.deleteObject(id);
        await ksaIndex.deleteObject(id);
        await kwtIndex.deleteObject(id);

        await this.removeProductFromActiveCarts(id);

        return { data: { id: id } }
    }

    model.productCoverImage = async function productCoverImage(item) {

        let coverImageUrl = default_image_url;

        let _link = link
            .select('pm.image as _image', 'pm.cover as _cover', 'pm.alternate_cover as _alternateCover')
            .from('product_media as pm')
            .where('pm.id_product', item.id)
            .where(function (q) {
                q.where('pm.cover', true)
                    .orWhere('pm.alternate_cover', true)
            })

        let result = await _link;

        result = knexnest.nest(result);

        if (result && result.length > 0) {
            const imageName = result.find((img) => img.cover)?.image || result.find((img) => img.alternateCover)?.image

            coverImageUrl = `${cloudfront_url}${product_bucket}${imageName}`;
        }

        return coverImageUrl;
    }

    model.productDetail = async function productDetail(params, query, i8ln) {

        const { id } = params;

        let { fromDashboard } = query;

        if ([true, 'true'].includes(fromDashboard)) {
            fromDashboard = true
        } else {
            fromDashboard = false
        }

        let customerId = null;

        const { locale, countryIso, cofeCustomerToken, city: customerCity } = i8ln

        if (cofeCustomerToken) {
            const customer = await mdlCategoryProducts.autheticateCustomer(cofeCustomerToken);

            if (!customer.data) { return customer; }

            const { id } = customer.data;

            customerId = id;
        }

        let countries = await mdlCategoryProducts.getCountries([countryIso]);

        let vatRate = default_vat;
        let currency = default_currency;
        let country_id = null

        if (countries) {
            vatRate = countries[0].vatRate;
            currency = countries[0].currency.symbol;
            country_id = countries[0].id;
        }

        const product = { data: null };

        let _link = link
            .select(
                'p.id as _id',
                'p.active as _active',
                'p.approval_status as _approvalStatus',
                'ps.product_price_tax_excl as _price',
                'ps.id_supplier as _idSupplier',
                'smd.name as _supplierName',
                's.image as _supplierImage',
                'ps.product_supplier_reference as _reference',
                'pm.name as _name',
                'mm.name as _manufacturer',
                'm.slug as _manufacturerSlug',
                'mm.id_manufacturer as _idManufacturer',
                'pm.short_description as _shortDescription',
                'pm.description as _description',
                'pm.markdown_desc as _markdownDescription',
                'pm.markdown_short as _markdownShortDesc',
                'pst.quantity as _quantity',
                'pst.allow_backorder as _allowBackOrder',
                'cm.id_category as _categoryId',
                'cm.name as _categoryName',
                'pi.image as _images__image',
                'pi.cover as _images__cover',
                'pi.alternate_cover as _images__alternateCover',
                'pv.video as _videos__video',
                'pf.id_feature as _features__idFeature',
                'pf.id_feature_value as _features__idFeatureValue',
                'pt.id_tag as _tag',
                'pf.id_feature_group as _features__idFeatureGroup',
                'pcc.id_country as _countries__id',
                'pcc.country_name as _countries__name',
                'ofp.id_offer as _offerId',
                'pc.id_category as _categories__id'
            )
            .from('products as p')
            .innerJoin('product_metadata as pm', 'p.id', 'pm.id_product')
            .innerJoin('manufacturers_metadata as mm', 'p.id_manufacturer', 'mm.id_manufacturer')
            .innerJoin('manufacturers as m', 'p.id_manufacturer', 'm.id')
            .innerJoin('product_suppliers as ps', 'p.id', 'ps.id_product')
            .innerJoin('suppliers_metadata as smd', 'ps.id_supplier', 'smd.id_supplier')
            .innerJoin('suppliers as s', 'ps.id_supplier', 's.id')
            .innerJoin('category_metadata as cm', 'p.id_category_default', 'cm.id_category')
            .innerJoin('product_stock as pst', 'p.id', 'pst.id_product')
            .leftJoin('product_countries as pcc', 'p.id', 'pcc.id_product')
            .leftJoin('product_media as pi', 'p.id', 'pi.id_product')
            .leftJoin('product_videos as pv', 'p.id', 'pv.id_product')
            .leftJoin('product_features as pf', 'p.id', 'pf.id_product')
            .leftJoin('product_tags as pt', 'p.id', 'pt.id_product')
            .leftJoin('offer_products as ofp', 'p.id', 'ofp.id_product')
            .leftJoin('product_category as pc', 'p.id', 'pc.id_product')
            .where('pm.id_lang', locale)
            .where('mm.id_lang', locale)
            .where('smd.id_lang', languages['en'])
            .where('ps.is_default', true)
            .where('cm.id_lang', locale)
            //.where('p.id', id)
            .where('pt.id_product_attribute', null)
            .whereNull('p.deleted_at')

        if (!guid.validate(id)) {
             _link = _link.where('p.slug', id)   
        } else {
            _link = _link.where('p.id', id)   
        }       

        let result = await _link;

        result = knexnest.nest(result);

        if (result && result.length > 0) {

            let _products = result.map(async (item) => {

                let productMeta = await link.select('*').where('pm.id_product', item.id).from('product_metadata as pm')

                let supplierCity = 'Others';

                let supplierLocation = await link.where({'id_supplier': item.idSupplier, 'id_country': country_id, 'active': true})
                    .whereNull('deleted_at')
                    .from('supplier_locations').first('city_name');

                if (supplierLocation) {
                    supplierCity = supplierLocation.city_name;
                }

                item.eta = null;

                let eta = await this.calculateEta(customerCity, supplierCity, countryIso);

                if (eta) {
                    item.eta = eta
                }

                item.supplierImage = (item.supplierImage) ? `${cloudfront_url}${supplier_bucket}${item.supplierImage}` :
                    `${cloudfront_url}${supplier_bucket}${default_supplier_image}`;

                if (item.tag) {
                    let tag = link.where('id', item.tag).where('id_lang', locale).from('tags as fm').first('name')

                    let tagValue = await tag;

                    if (tagValue)
                        item.tag = tagValue.name
                }

                for (const image of item.images) {
                    image.imageUrl = `${cloudfront_url}${product_bucket}${image.image}`;

                    image.alternate_cover = image.alternateCover
                    delete image.alternateCover
                }

                if (item.features && item.features.length > 0) {
                    for (const features of item.features) {

                        let feat = link.select('fm.name as _name').where('fm.id_feature', features.idFeature)
                            .where('fm.id_lang', locale).from('features_metadata as fm')

                        let val = link.select('fv.name as _name').where('fv.id_feature_value', features.idFeatureValue)
                            .where('fv.id_lang', locale).from('feature_values_metadata as fv')

                        const featureGroup = await link.select('fg.name as _name').where('fg.id_feature_group', features.idFeatureGroup)
                            .where('fg.id_lang', locale).from('feature_groups_metadata as fg')

                        let feature = await feat;

                        let featureValue = await val;

                        if (featureGroup?.length > 0) {
                            features.feature_group = featureGroup[0]._name;
                            features.id_feature_group = features.idFeatureGroup;
                            delete features.idFeatureGroup

                            if (feature && feature.length > 0) {
                                features.feature_name = feature[0]._name;
                                features.id_feature = features.idFeature;
                                delete features.idFeature

                                if (featureValue && featureValue.length > 0) {
                                    features.feature_value = featureValue[0]._name;
                                    features.id_feature_value = features.idFeatureValue
                                    delete features.idFeatureValue
                                }
                            }
                        }
                    }
                }

                item.isWished = false;

                item.isNotified = false;

                if (customerId) {
                    const alreadyWished = await link('products_wishlist')
                        .where('id_product', item.id).where('id_customer', customerId).first('id')

                    if (alreadyWished)
                        item.isWished = true;

                    const alreadyNotified = await link('product_notify_when_available')
                        .where('id_product', item.id).where('id_customer', customerId).first('id_product')

                    if (alreadyNotified)
                        item.isNotified = true;
                }

                item.categories = item.categories.map(({ id }) => id)

                const parentCategories = await mdlCategories.getParentCategory(item.categories);

                item.parentCategory = parentCategories.name;

                if(item.videos && item.videos.length > 0) {

                    item.videos[0].title = i18n.__('product_demo')

                    if (item.categories.includes('11943b38-b41e-456f-be87-18e653b969fa'))
                        item.videos[0].title = i18n.__('brewing_tutorial')
                    
                    if (item.categories.includes('244272ea-9200-4274-a510-101d62170417'))
                        item.videos[0].title = i18n.__('tutorial')

                    if (item.categories.includes('5008586f-e98d-4390-a4f3-eee79b577283'))
                        item.videos[0].title = i18n.__('espresso_demo')
               
                }

                item.offer = null;

                if (item.offerId) {
                    item.offer = await mdlCategoryProducts.getProductOffer(item.id, locale);
                }

                delete item.offerId;

                item.priceTaxExcl = item.price;

                item.priceTaxExcl = parseFloat(item.priceTaxExcl);

                item.price = await mdlCategoryProducts.productVatCalculation(item.price, vatRate)

                let specificPrice = await mdlCategoryProducts.specificPrice(item, fromDashboard)

                item.reductionPrice = await mdlCategoryProducts.getProductDiscountedPrice(specificPrice, item.priceTaxExcl, vatRate);

                let reductionAmount = (item.reductionPrice) ? item.reductionPrice.reductionAmount : 0;

                let reductionAmountTaxExcl = (item.reductionPrice) ? item.reductionPrice.reductionAmountTaxExcl : 0;

                if (fromDashboard === false) {
                    item.priceTaxExcl = item.priceTaxExcl - reductionAmountTaxExcl;
                }

                item.finalPrice = item.price - reductionAmount;

                item.finalPrice = item.finalPrice.toFixed(2);

                item.finalPrice = parseFloat(item.finalPrice);

                item.currency = currency;

                item.availbleForOrder = true;
                if (item.quantity <= 0 && item.allowBackOrder == false) {
                    item.availbleForOrder = false
                    item.tag = 'Out of Stock';

                    if (locale === languages['ar'])
                        item.tag = 'نفد من المخزون'
                }

                let _checkAttributes = link
                    .where('p.id_product', item.id)
                    .where('p.id_supplier', item.idSupplier)
                    .whereNull('p.deleted_at')
                    .whereNull('pst.deleted_at')
                    .whereNull('pi.deleted_at')
                    .from('product_attributes as p')
                    .innerJoin('product_stock as pst', 'p.id', 'pst.id_product_attribute')
                    .leftJoin('product_attribute_media as pi', 'p.id', 'pi.id_product_attribute')
                    .leftJoin('product_tags as pt', 'p.id', 'pt.id_product_attribute')
                    .select('p.id as _id', 'p.id_product as _idProduct', 'p.id_supplier as _idSupplier',
                        'pst.quantity as _quantity', 'pst.allow_backorder as _allowBackOrder',
                        'p.price as _price', 'p.reference as _reference', 'p.default_on as _defaultOn',
                        'pi.image as _images__image', 'pt.id_tag as _tag'
                    )

                let attributes = await _checkAttributes;

                attributes = knexnest.nest(attributes);

                item.productAttributes = [];
                if (attributes && attributes.length > 0) {
                    let productAttributes = await this.productAttributes(item, attributes, i8ln.locale, vatRate, fromDashboard)
                    item = productAttributes.product
                    item.productAttributes = productAttributes.attributes;
                }

                if (productMeta)
                    item.product_metadata = productMeta

                item.tabby = false;

                let tabbyCheckAmount = item.finalPrice;

                let tabbyRequestData = { amount: tabbyCheckAmount.toString(), payment_method: 'tabby' };

                let checkTabby = await this.checkPaymentMethod(tabbyRequestData, i8ln);

                if (checkTabby && checkTabby.length > 0)
                    item.tabby = true;

                return item;
            })

            result = await Promise.all(_products);
        }

        product.data = result;

        return product;
    }

    model.productAttributes = async function productAttributes(product, attributes, locale, vatRate, fromDashboard = false) {

        let totalQuantity = 0;

        const productPrice = product.price
        const productPriceTaxExcl = product.priceTaxExcl

        let _attributes = attributes.map(async (item) => {
            if (item.tag) {
                let tag = link.where('id', item.tag).where('id_lang', locale).from('tags as fm').first('name')

                let tagValue = await tag;

                if (tagValue)
                    item.tag = tagValue.name
            }

            item.impactPrice = item.price;

            item.priceTaxExcl = parseFloat(productPriceTaxExcl)

            item.priceTaxExcl = productPriceTaxExcl + parseFloat(item.price)

            item.price = await mdlCategoryProducts.productVatCalculation(item.price, vatRate)
            item.price = productPrice + item.price;

            let currentProduct = product;
            currentProduct.id_product_attribute = item.id;

            let specificPrice = await mdlCategoryProducts.specificPrice(currentProduct, fromDashboard)

            delete currentProduct.id_product_attribute

            item.reductionPrice = await mdlCategoryProducts.getProductDiscountedPrice(specificPrice, item.priceTaxExcl, vatRate);

            let reductionAmount = (item.reductionPrice) ? item.reductionPrice.reductionAmount : 0;

            let reductionAmountTaxExcl = (item.reductionPrice) ? item.reductionPrice.reductionAmountTaxExcl : 0;

            if (fromDashboard === false) {
                item.priceTaxExcl = item.priceTaxExcl - reductionAmountTaxExcl;
            }

            item.finalPrice = item.price - reductionAmount;

            item.finalPrice = item.finalPrice.toFixed(2);

            item.finalPrice = parseFloat(item.finalPrice);

            item.availbleForOrder = true;
            if (item.quantity <= 0 && item.allowBackOrder == false) {
                item.availbleForOrder = false
                item.tag = "Out of stock"

                if (locale === languages['ar'])
                    item.tag = 'نفد من المخزون'
            }

            item.images.forEach(image => {
                image.imageUrl = `${cloudfront_url}${product_bucket}${image.image}`;
            })

            if (item.defaultOn) {

                if (item.images?.length)
                    product.productImage = item.images[0].imageUrl

                if (!fromDashboard) {
                    product.price = item.price;
                    product.reference = item.reference;
                    product.finalPrice = item.finalPrice;
                    product.priceTaxExcl = item.priceTaxExcl;
                    product.reductionPrice = item.reductionPrice;
                    product.availbleForOrder = item.availbleForOrder;
                    product.allowBackOrder = item.allowBackOrder;
                    product.tag = item.tag
                    product.images = item.images;
                    product.quantity = item.quantity;
                }
            }

            totalQuantity += item.quantity;

            let _link = link
                .select(
                    'attr.id as _idAttribute',
                    'attr.position as _position',
                    'attr.name as _attributeName',
                    'attr.code as _attributeCode',
                    'attr_grp.name as _attributeGroup',
                    'attr_grp.group_type as _groupType',
                    'attr_grp.id as _idAttributeGroup',
                )
                .from('product_attribute_combinations as pac')
                .innerJoin('attributes as attr', 'pac.id_attribute', 'attr.id')
                .innerJoin('attribute_groups as attr_grp', 'attr.id_attribute_group', 'attr_grp.id')
                .where('pac.id_product_attribute', item.id)
                .where('attr.id_lang', locale)
                .where('attr_grp.id_lang', locale)

            let result = await _link;

            result = knexnest.nest(result);

            item.attributes = result

            return item
        })

        attributes = await Promise.all(_attributes);

        if (fromDashboard) product.quantity = totalQuantity;

        return { attributes: attributes, product: product };
    }

    model.removeProductFromActiveCarts = async function removeProductFromActiveCarts(id) {

        let requestData = { cart: { id_product: id } };

        const removedCart = await httpRequest.send({
            path: `${cartModuleUrl}${API_URLS.REMOVE_CART_ITEM}`,
            method: 'POST',
            headers: {},
            params: requestData,
            json: true
        });

        let result = removedCart.data

        return result;
    }

    model.notifyMe = async function notifyMe(product, i8ln) {

        const { id_product, id_product_attribute } = product;

        const { cofeCustomerToken } = i8ln;

        let id_customer;

        const checkProduct = await link
            .from('product_stock as ps')
            .innerJoin('products as p', 'ps.id_product', 'p.id')
            .where({ 'p.active': true, 'ps.id_product': id_product, 'ps.id_product_attribute': id_product_attribute })
            .whereNull('p.deleted_at')
            .first('ps.quantity')

        if (!checkProduct) {
            throw new Error(`select_valid_product`)
        }

        if (checkProduct.quantity > 0) {
            throw new Error(`already_instock`)
        }

        if (cofeCustomerToken) {
            const customer = await mdlCategoryProducts.autheticateCustomer(cofeCustomerToken);

            if (!customer.data) { return customer; }

            const { id } = customer.data;

            id_customer = id;
        }

        const checkAlready = await link('product_notify_when_available')
            .where({ id_product, id_product_attribute, id_customer })
            .first()

        if (checkAlready) {
            throw new Error(`alert_already_configured`)
        }

        const configureAlert = await link('product_notify_when_available').insert({
            id_product, id_product_attribute, id_customer
        },
            '*');

        return { "data": configureAlert };
    }

    model.getSupplierProductDetails = async function getSupplierProductDetails(id_products, id_suppliers, i8ln) {

        const { locale, countryIso } = i8ln

        let countries = await mdlCategoryProducts.getCountries([countryIso]);

        let countryId = null;

        if (countries) {
            countryId = countries[0].id;
        }

        const result = {}

        const products = await link
            .select(
                'pm.image as image',
                'ps.id_product as productId',
                'ps.quantity as quantity',
                'ps.id_product_attribute as idProductAttribute',
                'pam.image as attributeImage',
            )
            .from('product_stock as ps')
            .leftJoin('product_media as pm', 'pm.id_product', 'ps.id_product')
            .leftJoin('product_attribute_media as pam', 'pam.id_product_attribute', 'ps.id_product_attribute')
            .whereIn('ps.id_product', id_products)

        const suppliers = []

        let data = await link
            .select(
                'sm.id_supplier as id',
                'sm.name as name',
                's.vat_number as vatNumber',
                's.phone as phone',
                's.email as email',
                'sl.first_name as firstName',
                'sl.last_name as lastName',
                'sl.company as company',
                'sl.address as address',
                'sl.country_name as country',
                'sl.city_name as city',
                'sl.active as active',
            )
            .from('suppliers_metadata as sm')
            .innerJoin('suppliers as s', 'sm.id_supplier', 's.id')
            .leftJoin('supplier_locations as sl', function () {
                this.on('sl.id_supplier', '=', 's.id')
                this.andOnVal('sl.id_country', countryId)
                this.andOnVal('sl.active', true)
              })
            .whereIn('sm.id_supplier', id_suppliers)
            .where('sm.id_lang', locale)

        data = groupBy(data, 'id')

        for (const [key, value] of Object.entries(data)) {
            if (value.length) {
                let supplierLocation = value.find((loc) => loc.active)

                if (!supplierLocation) {
                    supplierLocation = value[0]
                }

                if (supplierLocation.address) {
                    supplierLocation.location = {
                        firstName: supplierLocation.firstName,
                        lastName: supplierLocation.lastName,
                        company: supplierLocation.company,
                        address: supplierLocation.address,
                        country: supplierLocation.country,
                        city: supplierLocation.city,
                    }
                }

                delete supplierLocation.firstName
                delete supplierLocation.lastName
                delete supplierLocation.company
                delete supplierLocation.address
                delete supplierLocation.country
                delete supplierLocation.city
                delete supplierLocation.active

                suppliers.push(supplierLocation)
            }
        }

        result.data = {
            products,
            suppliers
        }

        return result
    }

    model.updateProductsStock = async function updateProductsStock(products) {

        for (let product of products) {

            const currentStock = await link.from('product_stock')
                .where({ 'id_product': product.id_product, 'id_product_attribute': product.id_product_attribute })
                .first('quantity')

            if (currentStock) {
                let updatedStock = currentStock.quantity - product.product_quantity

                await link('product_stock').update({ quantity: updatedStock })
                    .where({ id_product: product.id_product, id_product_attribute: product.id_product_attribute })
            }
        }

        return { data: products }
    }

    model.productToAlgolia = async function productToAlgolia(productIds) {

        const client = algoliasearch(algoliaAppId, algoliaAdminKey);
        const uaeIndex = client.initIndex(algoliaIndexUae);
        const ksaIndex = client.initIndex(algoliaIndexKsa)
        const kwtIndex = client.initIndex(algoliaIndexKwt)

        await uaeIndex.deleteObjects(productIds);
        await ksaIndex.deleteObjects(productIds);
        await kwtIndex.deleteObjects(productIds);

        let _link = link
            .select(
                'p.id as _id',
                'ps.product_price_tax_excl as _price',
                'ps.product_supplier_reference as _reference',
                'pm.name as _productName__name',
                'pm.id_lang as _productName__idLang',
                'ps.id_supplier as _idSupplier',
                'p.id_manufacturer as _idManufacturer',
                'mm.name as _brand__manufacturerName',
                'mm.image as _brand__manufacturerImage',
                'mm.id_lang as _brand__idLang',
                'p.id_category_default as _idCategory',
                'p.approval_status as _approvalStatus',
                'cm.name as _cat__categoryName',
                'cm.image as _cat__categoryImage',
                'cm.id_lang as _cat__idLang',
                'pm.short_description as _shortdescription__shortDescription',
                'pm.id_lang as _shortdescription__idLang',
                'pc.country_name as _countries__code',
                'pc.suggested as _countries__suggested',
                'ofp.id_offer as _offerId'
            )
            .from('products as p')
            .innerJoin('product_metadata as pm', 'p.id', 'pm.id_product')
            .innerJoin('product_countries as pc', 'p.id', 'pc.id_product')
            .innerJoin('manufacturers_metadata as mm', 'p.id_manufacturer', 'mm.id_manufacturer')
            .innerJoin('product_suppliers as ps', 'p.id', 'ps.id_product')
            .innerJoin('category_metadata as cm', 'p.id_category_default', 'cm.id_category')
            .leftJoin('offer_products as ofp', 'p.id', 'ofp.id_product')
            .where('ps.is_default', true)
            .where('p.active', true)
            .where('p.approval_status', 'Approved')
            .whereIn('p.id', productIds)
            .whereNull('p.deleted_at')

        let products = await _link;

        products = knexnest.nest(products);

        if (products && products.length > 0) {

            for (let product of products) {

                let productCountries = product.countries;

                product.name = {};
                product.manufacturer = { "name" : {}, "image" : {} };
                product.category = { "name" : {}, "image" : {} };
                product.shortDesc = {};
                product.offer = {};

                if (product.offerId) {
                    product.offer.en = await mdlCategoryProducts.getProductOffer(product.id, languages['en']);
                    product.offer.ar = await mdlCategoryProducts.getProductOffer(product.id, languages['ar']);
                }

                if(Object.keys(product.offer).length === 0) {
                    product.offer = null;
                }

                let nameEn = product.productName.find(item => item.idLang === languages['en']);
                let nameAr = product.productName.find(item => item.idLang === languages['ar']);

                let manufacturerEn = product.brand.find(item => item.idLang === languages['en']);
                let manufacturerAr = product.brand.find(item => item.idLang === languages['ar']);

                let categoryEn = product.cat.find(item => item.idLang === languages['en']);
                let categoryAr = product.cat.find(item => item.idLang === languages['ar']);

                let shortEn = product.shortdescription.find(item => item.idLang === languages['en']);
                let shortAr = product.shortdescription.find(item => item.idLang === languages['ar']);

                product.name.en = (nameEn) ? nameEn.name : null;
                product.name.ar = (nameAr) ? nameAr.name : product.name.en;

                product.manufacturer.id = product.idManufacturer;
                product.manufacturer.name.en = (manufacturerEn) ? manufacturerEn.manufacturerName : null;
                product.manufacturer.name.ar = (manufacturerAr) ? manufacturerAr.manufacturerName : product.manufacturer.en;
                product.manufacturer.image.en = (manufacturerEn && manufacturerEn.manufacturerImage) ? `${cloudfront_url}${manufacturer_bucket}${manufacturerEn.manufacturerImage}` : null;
                product.manufacturer.image.ar = (manufacturerAr && manufacturerAr.manufacturerImage) ? `${cloudfront_url}${manufacturer_bucket}${manufacturerAr.manufacturerImage}` : null;

                product.category.id = product.idCategory;
                product.category.name.en = (categoryEn) ? categoryEn.categoryName : null;
                product.category.name.ar = (categoryAr) ? categoryAr.categoryName : product.category.en;
                product.category.image.en = (categoryEn && categoryEn.categoryImage) ? `${cloudfront_url}${category_bucket}${categoryEn.categoryImage}` : null;
                product.category.image.ar = (categoryAr && categoryAr.categoryImage) ? `${cloudfront_url}${category_bucket}${categoryAr.categoryImage}` : null;

                product.shortDesc.en = (shortEn) ? shortEn.shortDescription : null;
                product.shortDesc.ar = (shortAr) ? shortAr.shortDescription : product.shortDesc.en;

                delete product.productName;
                delete product.brand;
                delete product.cat;
                delete product.idManufacturer;
                delete product.idCategory;
                delete product.shortdescription;
                delete product.countries;
                delete product.offerId;

                product.image = await this.productCoverImage(product)

                for (let country of productCountries) {

                    let countryProduct = JSON.parse(JSON.stringify(product))
                    let vatRate = default_vat;
                    let currency = default_currency;
                    let algoliaIndex = algoliaIndexUae;

                    countryProduct.suggested = 'false';

                    if (country.suggested)
                        countryProduct.suggested = 'true';

                    if (country.code === 'KSA') {
                        vatRate = 15;
                        currency = 'SAR';
                        algoliaIndex = algoliaIndexKsa
                    } else if (country.code === 'KWT') {
                        vatRate = 0;
                        currency = 'KWD';
                        algoliaIndex = algoliaIndexKwt
                    }

                    countryProduct.currency = currency;

                    countryProduct.priceTaxExcl = countryProduct.price;

                    countryProduct.priceTaxExcl = parseFloat(countryProduct.priceTaxExcl);

                    countryProduct.price = parseFloat(countryProduct.price);

                    countryProduct.price = await mdlCategoryProducts.productVatCalculation(countryProduct.price, vatRate)

                    let specificPrice = await mdlCategoryProducts.specificPrice(countryProduct)

                    countryProduct.reductionPrice = await mdlCategoryProducts.getProductDiscountedPrice(specificPrice, countryProduct.priceTaxExcl, vatRate);

                    let reductionAmount = (countryProduct.reductionPrice) ? countryProduct.reductionPrice.reductionAmount : 0;

                    let reductionAmountTaxExcl = (countryProduct.reductionPrice) ? countryProduct.reductionPrice.reductionAmountTaxExcl : 0;

                    countryProduct.priceTaxExcl = countryProduct.priceTaxExcl - reductionAmountTaxExcl;

                    countryProduct.finalPrice = countryProduct.price - reductionAmount;

                    countryProduct.finalPrice = countryProduct.finalPrice.toFixed(2);

                    countryProduct.finalPrice = parseFloat(countryProduct.finalPrice);

                    let _checkAttributes = link
                        .where('p.id_product', countryProduct.id)
                        .where('p.id_supplier', countryProduct.idSupplier)
                        .whereNull('p.deleted_at')
                        .whereNull('pst.deleted_at')
                        .whereNull('pi.deleted_at')
                        .from('product_attributes as p')
                        .innerJoin('product_stock as pst', 'p.id', 'pst.id_product_attribute')
                        .leftJoin('product_attribute_media as pi', 'p.id', 'pi.id_product_attribute')
                        .select('p.id as _id', 'p.id_product as _idProduct', 'p.id_supplier as _idSupplier',
                            'pst.quantity as _quantity', 'pst.allow_backorder as _allowBackOrder',
                            'p.price as _price', 'p.reference as _reference', 'p.default_on as _defaultOn',
                            'pi.image as _images__image',
                        )

                    let attributes = await _checkAttributes;

                    attributes = knexnest.nest(attributes);

                    if (attributes && attributes.length > 0) {

                        let productAttributes = await this.productAttributes(countryProduct, attributes, languages['en'], vatRate)
                        let attributedData = productAttributes.product;

                        countryProduct.image = attributedData.productImage;

                        delete countryProduct.availbleForOrder
                        delete countryProduct.allowBackOrder
                        delete countryProduct.productImage
                        delete countryProduct.images
                        delete countryProduct.quantity
                    }

                    const index = client.initIndex(algoliaIndex);

                    const object = countryProduct;
                    object.objectID = countryProduct.id;

                    index.saveObject(object).then((objectID) => {
                        console.log(objectID)
                    }).catch(err => { console.log(err); });
                }
            }
        }
    }

    model.checkPaymentMethod = async function checkPaymentMethod(requestData, i8ln) {

        const { countryIso, xAppVersion, xAppClient } = i8ln;

        const paymentMethod = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.CHECK_PAYMENT_OPTION}`,
            method: 'POST',
            headers: { 'country-iso': countryIso, 'x-app-version': xAppVersion, 'x-app-os': xAppClient },
            params: requestData,
            json: true
        });

        let result = paymentMethod.data

        return result;
    }

    model.calculateEta = async function calculateEta(customerCity, supplierCity, countryIso) {

        let requestData = { filters: { customer_city: customerCity, supplier_city: [supplierCity] } };

        const calculatedEta = await httpRequest.send({
            path: `${coreModuleUrl}${API_URLS.CALCULATE_ETA}`,
            method: 'POST',
            headers: { 'country-iso': countryIso, 'locale': i18n.getLocale() },
            params: requestData,
            json: true
        });

        let result = calculatedEta.data

        return result;
    }

    return model;
}
