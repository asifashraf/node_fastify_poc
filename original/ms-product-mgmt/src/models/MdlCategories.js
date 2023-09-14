module.exports = function MdlCategories(opts) {

    const { config, baseModel, knexnest, mdlCategoryProducts, mdlManufacturers, guid, constants, _, slugify } = opts;

    const model = baseModel('categories');

    const { link } = model;

    const { languages, cloudfront_url, category_bucket, manufacturer_bucket, default_uuid, default_image_url } = config;

    const { default_vat } = constants;

    model.getAll = async function getAll( filters, pagination, i8ln, fromDashboard ) {

        let response = { data: null, pagination: null }

        const { perPage, currentPage, paginate } = pagination;

        const { locale, countryIso } = i8ln;

        const { active, id_parent, id_category, keyword, subCategories } = filters;

        let _link = link
            .select(
                'c.id as _id',
                'cm.name as _name',
                'cm.description as _description',
                'cm.image as _image',
                'c.slug as _slug'
            )
            .from('categories as c')
            .innerJoin('category_metadata as cm', 'c.id', 'cm.id_category')
            .where('cm.id_lang', locale)
            .whereNull('c.deleted_at')
            .orderBy('c.created_at', 'desc')

        if (id_parent && !id_category) _link = _link.where('c.id_parent', id_parent);

        if (active) _link = _link.where('c.active', active);

        if (id_category) _link = _link.whereIn('c.id', id_category)

        if (keyword) _link = _link.where('cm.name', 'Ilike', '%' + filters.keyword + '%')

        if (paginate === true)
            _link = _link.paginate({ perPage, currentPage, isLengthAware: true });

        let result = await _link;

        if (paginate === true) {
            response.data = knexnest.nest(result.data);
            response.pagination = result.pagination;
        } else {
            response.data = knexnest.nest(result);
        }

        let categories = response.data;

        if (categories) {
            for (let category of categories) {

                const { image, id } = category;

                const categoryIndex = response.data.findIndex(x => x.id === id);

                if (categoryIndex !== -1) {

                    if (!image) {
                        response.data[categoryIndex].image = `${default_image_url}`;
                    } else {
                        response.data[categoryIndex].image = `${cloudfront_url}${category_bucket}${image}`;
                    }

                    if (subCategories) {
                        response.data[categoryIndex].subCategories = await this.getChildCategories(category.id, locale, countryIso, fromDashboard);
                    }
                }
            }
        }

        return response;
    }

    model.createCategory = async function createCategory(category) {

        const { id_parent } = category;

        const categorySlug = slugify(category.name, { lower: true });

        const [insertId] = await link('categories').insert({
            id: guid.v4(),
            id_parent,
            slug: categorySlug
        }, 'id');

        const { id } = insertId;

        const categoryMetadata = await link('category_metadata').insert([
            { id: guid.v4(), id_category: id, name: category.name, id_lang: languages.en, description: category.description, image: category.image  },
            { id: guid.v4(), id_category: id, name: category.name_ar, id_lang: languages.ar, description: category.description_ar, image: category.image_ar },
        ], '*');

        return { data: { category_id: id, category_metadata : categoryMetadata } };
    }

    model.updateCategory = async function updateCategory(category) {

        const {
            id: categoryId,
            id_parent,
            active,
            name,
            image,
            description,
            meta_title,
            meta_description,
            meta_keywords,
            name_ar,
            image_ar,
            description_ar,
            meta_title_ar,
            meta_description_ar,
            meta_keywords_ar,
            subcategories
        } = category;

        if (id_parent) {
            if (categoryId !== id_parent) {
                const itExists = await link('categories')
                                    .where('id', id_parent)
                                    .first('id')
                if (!itExists)
                    throw new Error(`parent_category_not_exists`)

            } else if (categoryId === id_parent) {
                throw new Error(`parent_should_not_same`)
            }
        }

        if (active !== undefined || id_parent || name) {
            
            const updatedFields = { updated_at: this.now() }

            if (active !== undefined || id_parent ) {
                updatedFields.active = active;
                updatedFields.id_parent = id_parent;
            }

            if (name) {
                const categorySlug = slugify(name, { lower: true });
                updatedFields.slug = categorySlug;
            }
        
            const updatedCategory = await this.update(updatedFields, {
                id: categoryId,
            });
        
            if (!updatedCategory?.length) {
                throw new Error(`category_not_exists`);
            }
        }

        // Category Metadata Update
        if (name || image || description || meta_description || meta_title || meta_keywords) {
            await link('category_metadata')
                .update({ name, image, description, meta_description, meta_title, meta_keywords })
                .where({ id_category: categoryId, id_lang: languages.en })
        }

        if (name_ar || image_ar || description_ar || meta_description_ar || meta_title_ar || meta_keywords_ar) {
            await link('category_metadata')
                .update({ name: name_ar, image: image_ar, description: description_ar, meta_description: meta_description_ar,
                    meta_title: meta_title_ar, meta_keywords: meta_keywords_ar })
                .where({ id_category: categoryId, id_lang: languages.ar })
        }

        const categoryMetaData = await link('category_metadata')
            .where({ id_category: categoryId })
            .returning('*')

        if(categoryMetaData && categoryMetaData.length > 0) {
            categoryMetaData.map(item => {
                item.image = `${cloudfront_url}${category_bucket}${item.image}`;
            });
        }

        if (subcategories?.length) {
            const existingSubCategories = await link('categories as c')
                    .select('c.id as id')
                    .where('c.id_parent', categoryId)
                    .where('c.active', true)

            const existingSubCategoryIds = existingSubCategories.map((category) => category.id)

            const toCreate = []
            const toDelete = []

            for (let index = 0; index < subcategories.length; index++) {
                const subcategory = subcategories[index];

                if (subcategory.delete) {
                    toDelete.push(subcategory.id)
                    continue
                }

                if (!existingSubCategoryIds.includes(subcategory.id)){
                    toCreate.push(subcategory)

                    const itExists = await link('categories').where('id', subcategory.id).first()

                    if (!itExists)
                        throw new Error(`child_category_not_exists`)
                }
            }

            if (toDelete.length) {
                await link('categories')
                    .update({ id_parent: default_uuid })
                    .whereIn('id', toDelete)
            }

            if (toCreate.length) {
                for (const newCategory of toCreate) {
                    await link('categories')
                        .update({ id_parent: categoryId })
                        .where('id', newCategory.id)
                }
            }
        }

        return { data : { category_id : categoryId, category_metadata: categoryMetaData } };
    }

    model.getFilters = async function getFilters(filters, i8ln) {

        const { locale, countryIso } = i8ln;

        let {
            id_category,
            id_subcategory,
            id_manufacturer,
            id_supplier,
            features,
            prices,
            offers,
            slug_type,
            slug
        } = filters;

        let result = { data: [] };

        let finalFilters = {
            brands: [],
            subCategories: [],
            features: [],
            prices: []
        };


        if (slug_type) {

            if (slug_type === 'category') {

                const slugCategories = await this.getCategoriesBySlug(slug)

                if (slugCategories.parentCategory === null && slugCategories.subCategory?.length === 0) {

                    result.data = finalFilters;

                    return { data : result };
                } 

                if (slugCategories.parentCategory !== null) {
                    id_category = slugCategories.parentCategory
                }

                if (slugCategories.subCategory.length > 0) {
                    id_subcategory = slugCategories.subCategory;
                }

            } else if (slug_type === 'manufacturer') {
                
                const slugManufacturer = await mdlManufacturers.getManufacturerBySlug(slug)

                if (slugManufacturer.id_manufacturer?.length === 0) {

                    result.data = finalFilters;

                    return { data : result };
                }

                if (slugManufacturer.id_manufacturer.length > 0) {
                    id_manufacturer = slugManufacturer.id_manufacturer
                }
            }
        }

        let selectedManufacturers = id_manufacturer;
        let selectedSubCategories = id_subcategory;
        let selectedFeatures = features;
        let categoryIds = [];

        if (id_category) {

            categoryIds.push(id_category);

            let categories = await this.getChildCategories(id_category, locale, countryIso);

            if (categories && categories.length > 0) {
                categoryIds = categories.map((category) => category.id);
            }
        }

        if (selectedSubCategories && selectedSubCategories.length > 0) {

             if (categoryIds.length === 0) {
                 categoryIds = selectedSubCategories
             }

             categoryIds = categoryIds.filter(el => selectedSubCategories.includes(el));
        }

        let offerProducts = null;

        if (offers) {
            offerProducts = await mdlCategoryProducts.getOfferProducts(filters, i8ln);
        }

        let products  = await this.getProductsByCategories(categoryIds, selectedManufacturers, id_supplier, prices, countryIso, offerProducts);

        let productIds = [];

        if(products && products.length > 0) {

            if (products.minprice !== products.maxprice)
                finalFilters.prices.push({"min_price": products.minprice, "max_price" : products.maxprice})

            productIds = products.map((product) => product.id);

            if (selectedFeatures && selectedFeatures.length > 0) {
                let selectedFeatureProducts = await mdlCategoryProducts.getProductsByFeatures(productIds, selectedFeatures);

                productIds = productIds.filter(el => selectedFeatureProducts.includes(el));
            }

            /*if (id_supplier) {
                let _selectedSupplierProducts = await link.from('product_suppliers')
                    .where('id_supplier', id_supplier).pluck('id_product')

                productIds = productIds.filter(el => _selectedSupplierProducts.includes(el));
            }

            if (selectedManufacturers && selectedManufacturers.length > 0) {
                let _selectedManProducts = await link.from('products')
                    .whereIn('id_manufacturer', selectedManufacturers).pluck('id')

                productIds = productIds.filter(el => _selectedManProducts.includes(el));
            }*/
        }

        finalFilters.subCategories = await this.getCategoriesByProducts(productIds, selectedSubCategories, locale);

        finalFilters.brands = await this.getFilteredManufacturers(productIds, selectedManufacturers, locale);

        finalFilters.features = await this.getFeaturesByProduct(productIds, selectedFeatures, locale);

        if (selectedSubCategories && selectedSubCategories.length > 0) {

            let existingIds = finalFilters.subCategories.map((category) => category.id_category);

            const selectedDiff = _.differenceBy(selectedSubCategories, existingIds);

            if (selectedDiff.length > 0) {
                let cats = await link.select('c.id as id_category', 'c.id_parent as id_parent', 'cm.name as name')
                    .from('categories as c')
                    .innerJoin('category_metadata as cm', 'cm.id_category', 'c.id')
                    .where('cm.id_lang', locale)
                    .whereIn('c.id', selectedDiff);

                cats = cats.map(v => ({...v, selected: true, product_count: 0}))

                finalFilters.subCategories.push(...cats)
            }
        }

        if (selectedManufacturers && selectedManufacturers.length > 0) {

            let existingBrandIds = finalFilters.brands.map((brand) => brand.id_manufacturer);

            const selectedBrandDiff = _.differenceBy(selectedManufacturers, existingBrandIds);

            if (selectedBrandDiff.length > 0) {

                let brands = await link
                    .select('mm.id_manufacturer', 'mm.name' )
                    .from('manufacturers_metadata as mm')
                    .where('mm.id_lang', locale)
                    .whereIn('mm.id_manufacturer', selectedBrandDiff)
                    .orderBy('mm.name', 'ASC')

                brands = brands.map(v => ({...v, selected: true, productCount: 0}))

                finalFilters.brands.push(...brands)
            }
        }

        if (finalFilters.prices.length === 0) {
            if (prices && prices.hasOwnProperty('min_price')) {
                finalFilters.prices.push({"min_price": prices.min_price, "max_price" : prices.max_price})
            }
        }

        result.data = finalFilters;

        return { data : result };
    }

    model.deleteCategory = async function deleteCategory(id) {
        return await this.softDelete(
            { id },
            { active: false }
        );
    }

    model.getChildCategories = async function getChildCategories(id_category, locale, countryIso, fromDashboard = false) {

        let _link = link
            .select('c.id as _id', 'c.slug as _slug', 'cm.name as _name', 'cm.description as _description', 'cm.image as _image')
            .from('categories as c')
            .innerJoin('category_metadata as cm', 'c.id', 'cm.id_category')
            .orWhere('c.id_parent', id_category)
            .where('cm.id_lang', locale)
            .where('c.active', true)
            .whereNull('c.deleted_at')
            .orderBy('c.id', 'ASC')

        if (!fromDashboard) {

            let countries = await mdlCategoryProducts.getCountries([countryIso]);

            _link = _link.innerJoin('product_category as pc', 'c.id', 'pc.id_category')
                .innerJoin('products as p', 'pc.id_product', 'p.id')
                .where('p.active', true)
                .whereNull('p.deleted_at')

            if (countries) {
                _link = _link.innerJoin('product_countries as pcc', 'p.id', 'pcc.id_product')
                    .where('pcc.id_country', countries[0].id)
            }
        }

        let result = await _link;

        result = knexnest.nest(result);

        let categories = result;

        if (categories) {
            for (let category of categories) {
                const categoryIndex = result.findIndex(x => x.id === category.id);

                if (categoryIndex !== -1) {

                    const { image } = category;

                    if (!image) {
                        result[categoryIndex].image = `${default_image_url}`;
                    } else {
                        result[categoryIndex].image = `${cloudfront_url}${category_bucket}${image}`;
                    }
                }
            }
        }

        return result;
    }

    model.getProductsByCategories = async function getProductsByCategories(categoryIds, manufacturerIds, supplierId, prices, countryIso, offerProducts) {

        let countries = await mdlCategoryProducts.getCountries([countryIso]);

        let vatRate = default_vat;
        let country_id = null;

        if (countries) {
            vatRate = countries[0].vatRate;
            country_id = countries[0].id;
        }

        let _link = link
            .select('pc.id_product as _id', 'p.id_manufacturer as _idManufacturer', 'ps.product_price_tax_excl as _price')
            .from('categories as c')
            .innerJoin('product_category as pc', 'c.id', 'pc.id_category')
            .innerJoin('products as p', 'p.id', 'pc.id_product')
            .innerJoin('product_countries as pcc', 'p.id', 'pcc.id_product')
            .innerJoin('product_suppliers as ps', 'p.id', 'ps.id_product')
            .where('p.active', true)
            .where('p.approval_status', 'Approved')
            .whereNull('p.deleted_at')
            .where('pcc.id_country', country_id);

        if (offerProducts && offerProducts.length > 0) {
            _link = _link.whereIn('p.id', offerProducts)
        }

        if (categoryIds && categoryIds.length > 0) {
            _link = _link.whereIn('c.id', categoryIds)
        }

        if (manufacturerIds && manufacturerIds.length > 0) {
            _link = _link.whereIn('p.id_manufacturer', manufacturerIds)
        }

        if (supplierId && supplierId.length > 0) {
            _link = _link.where('ps.id_supplier', supplierId)
        }

        /*if (prices && prices.min_price)
            _link = _link.where('ps.product_price_tax_excl', '>=', prices.min_price)

        if (prices && prices.max_price)
            _link = _link.where('ps.product_price_tax_excl', '<=', prices.max_price)*/

        let result = await _link;

        result = knexnest.nest(result);

        if (result && result.length > 0) {

            let _products = result.map(async (item) => {

                item.id_product_attribute = default_uuid

                let _checkAttributes = link
                    .where('p.id_product', item.id)
                    .where('p.default_on', true)
                    .from('product_attributes as p')
                    .innerJoin('product_stock as pst', 'p.id', 'pst.id_product_attribute')
                    .leftJoin('product_attribute_media as pi', 'p.id', 'pi.id_product_attribute')
                    .select('p.id as _id', 'p.price as _price' )

                let attributes = await _checkAttributes;

                attributes = knexnest.nest(attributes);

                if (attributes?.length) {
                    item.id_product_attribute = attributes[0].id
                    item.price = parseFloat(item.price) + parseFloat(attributes[0].price)
                }

                item.priceTaxExcl = item.price;

                item.price = await mdlCategoryProducts.productVatCalculation(item.price, vatRate)

                let specificPrice = await mdlCategoryProducts.specificPrice(item)

                item.reductionPrice = await mdlCategoryProducts.getProductDiscountedPrice(specificPrice, item.priceTaxExcl, vatRate);

                let reductionAmount = (item.reductionPrice) ? item.reductionPrice.reductionAmount : 0;

                item.finalPrice = item.price - reductionAmount;

                return item;
            })

            result = await Promise.all(_products);

            if (prices && prices.hasOwnProperty('min_price')) {
                result = result.filter(item =>
                    item.finalPrice <= prices.max_price &&
                    item.finalPrice >= prices.min_price
                );
            }

            result.maxprice = Math.max(...result.map(o => o.finalPrice))
            result.minprice = Math.min(...result.map(o => o.finalPrice))
        }

        return result;
    }

    model.getFilteredManufacturers = async function getFilteredManufacturers(productIds, selectedManufacturers, locale) {

        let result = [];

        let _link = link
            .select('p.id as _id', 'p.id_manufacturer as _idManufacturer')
            .from('products as p')
            .whereIn('id', productIds)

        let products = await _link;

        products = knexnest.nest(products);

        if (products && products.length > 0) {

            let manufacturerIds = products.map((product) => product.idManufacturer);

            let _link2 = link
                .select('mm.id_manufacturer as _id', 'mm.name as _name', 'mm.image as _image', 'm.slug as _slug')
                .from('manufacturers_metadata as mm')
                .innerJoin('manufacturers as m', 'm.id', 'mm.id_manufacturer')
                .where('mm.id_lang', locale)
                .whereIn('mm.id_manufacturer', manufacturerIds)
                .orderBy('mm.name', 'ASC')

            let manufacturers = await _link2;

            manufacturers = knexnest.nest(manufacturers);

            let productCount = manufacturerIds.reduce((acc, val) => acc.set(val, 1 + (acc.get(val) || 0)), new Map());

            if(manufacturers && manufacturers.length > 0) {

                for (const item of manufacturers) {

                    let selected = false;
                    if (selectedManufacturers && selectedManufacturers.length > 0) {
                        if (selectedManufacturers.includes(item.id)) {
                            selected = true;
                        }
                    }

                    var obj = {};

                    obj['id_manufacturer'] = item.id,
                    obj['name'] = item.name,
                    obj['slug'] = item.slug,
                    obj['productCount'] = productCount.get(item.id),
                    obj['selected'] = selected
                    obj['image'] = `${cloudfront_url}${manufacturer_bucket}${item.image}`;

                    result.push(obj);
                }
            }
        }

        return result;
    }

    model.getCategoriesByProducts = async function getCategoriesByProducts(productIds, selectedCategory, locale) {

        let result = [];

        let _link = link
            .select('c.id as _id', 'c.id_parent as _idParent', 'cm.name as _name',
                'pc.id_category as _category__name'
            )
            .from('categories as c')
            .leftJoin("product_category as pc", "pc.id_category", "c.id")
            .count('pc.id_product as products')
            .groupBy('c.id', 'pc.id_category', 'cm.name')
            .innerJoin('category_metadata as cm', 'cm.id_category', 'pc.id_category')
            .where('cm.id_lang', locale)
            .where('c.id_parent', '!=', default_uuid)
            .whereIn('pc.id_product', productIds)

        let categories = await _link;

        for (const item of categories) {

            if (item.products > 0) {

                let selected = false;
                if (selectedCategory && selectedCategory.length > 0) {
                    if (selectedCategory.includes(item._id)) {
                        selected = true;
                    }
                }

                var obj = {};
                obj['id_category'] = item._id,
                obj['id_parent'] = item._idParent,
                obj['name'] = item._name
                obj['product_count'] = item.products,
                obj['selected'] = selected

                result.push(obj);
            }
        }

        return result;
    }

    model.getFeaturesByProduct = async function getFeaturesByProduct(productIds, selectedFeatures, locale) {

        let _link = link
            .select('pf.id_feature as _idFeature', 'fm.name as _featureName')
            .from('product_features as pf')
            .innerJoin('features_metadata as fm', 'fm.id_feature', 'pf.id_feature')
            .whereIn('pf.id_product', productIds)
            .where('fm.id_lang', locale)

        let productFeatures = await _link;

        productFeatures = knexnest.nest(productFeatures);

        if (productFeatures && productFeatures.length > 0) {

            for (const feature of productFeatures) {

                feature.featureValues = [];

                let _link = link
                    .select('pf.id_product as _idProduct',
                        'pf.id_feature_value as _idFeatureValue', 'fvm.name as _featureValueName')
                    .from('product_features as pf')
                    .innerJoin('feature_values_metadata as fvm', 'fvm.id_feature_value', 'pf.id_feature_value')
                    .whereIn('pf.id_product', productIds)
                    .where('fvm.id_lang', locale)
                    .where('pf.id_feature', feature.idFeature)

                let result = await _link;

                const featureValues = knexnest.nest(result);

                if(featureValues && featureValues.length > 0) {

                    let fvalues = featureValues.map((res) => res.idFeatureValue);

                    let productCount = fvalues.reduce((acc, val) => acc.set(val, 1 + (acc.get(val) || 0)), new Map());

                    for (const featureValue of featureValues) {

                        let selected = false;

                        if (selectedFeatures && selectedFeatures.length > 0) {
                            let checkValues = selectedFeatures.map((res) => res.id_feature_value);
                            checkValues = checkValues.flat(1);

                            if (checkValues.includes(featureValue.idFeatureValue))
                                selected = true;
                        }

                        var obj = {};

                        obj['idFeatureValue'] = featureValue.idFeatureValue,
                        obj['featureValueName'] = featureValue.featureValueName,
                        obj['productCount'] = productCount.get(featureValue.idFeatureValue),
                        obj['selected'] = selected

                        const index = feature.featureValues.findIndex(object => object.idFeatureValue === obj.idFeatureValue);

                       if (index === -1)
                            feature.featureValues.push(obj)
                    }
                }
            }
        }

        if (productFeatures == null)
            productFeatures = [];

        return productFeatures;
    }

    model.categoryDetail = async function categoryDetail(params) {

        const { id } = params;

        const category = await link('categories')
            .select('active', 'id_parent')
            .where('id', id)
            .first()

        if (!category)
            throw new Error(`category_not_exists`)

        const categoryMetaData = await link('category_metadata')
            .where({ id_category: id })
            .returning('*')

        if(categoryMetaData && categoryMetaData.length > 0) {
            categoryMetaData.map(item => {
                item.image = `${cloudfront_url}${category_bucket}${item.image}`;
            });
        }

        const subcategories = await link('categories as c')
            .select('c.id as id', 'cm.name as name')
            .innerJoin('category_metadata as cm', 'c.id', 'cm.id_category')
            .where('c.id_parent', id)
            .where('cm.id_lang', languages['en'])
            .where('c.active', true)

        return { data : {id, active: category.active, id_parent: category.id_parent, subcategories,
                category_metadata: categoryMetaData } };
    }

    model.getCategoriesManufactures = async function getCategoriesManufactures(params, i8ln) {

        let result = { "subCategories": [], "brands": [] };
        
        const { id } = params;

        const { locale, countryIso } = i8ln;

        let categories = await this.getChildCategories(id, locale, countryIso);

        if (categories && categories.length > 0) {

            result.subCategories = categories;

            let categoryIds = categories.map((category) => category.id);

            let countries = await mdlCategoryProducts.getCountries([countryIso]);

            let country_id = null;
    
            if (countries) {
                country_id = countries[0].id;
            }

            let categoryProducts = await link
                .select('pc.id_product as _id')
                .from('products as p')
                .innerJoin('product_category as pc', 'p.id', 'pc.id_product')
                .innerJoin('product_countries as pcc', 'p.id', 'pcc.id_product')
                .where('p.active', true)
                .where('p.approval_status', 'Approved')
                .whereNull('p.deleted_at')
                .whereIn('pc.id_category', categoryIds)
                .where('pcc.id_country', country_id)
                .groupBy('pc.id_product');

            categoryProducts = knexnest.nest(categoryProducts);

            if (categoryProducts && categoryProducts.length > 0) {

               let productIds = categoryProducts.map((product) => product.id);

               let brands = await this.getFilteredManufacturers(productIds, null, locale);

               if (brands.length > 0) {

                    brands.sort((a, b) => b.productCount - a.productCount);
                    const top9Brands = brands.slice(0, 9);

                    result.brands = top9Brands;
               }
            }

        }

        return { data : result };
    }

    model.getParentCategory = async function getParentCategory(categoryIds) {

        let category = await link.select('c.id', 'cm.name')
            .from('categories as c')
            .innerJoin('category_metadata as cm', 'c.id', 'cm.id_category')
            .where({ 'c.id_parent': default_uuid, 'cm.id_lang':   languages.en })
            .whereIn('c.id', categoryIds).first()

        if (!category)
            throw new Error(`category_not_exists`)

        return category;
    }

    model.getCategoriesBySlug = async function getCategoriesBySlug(slug) { 
    
        const response = { parentCategory: null, subCategory: [] }

        let exists = await link
            .from('categories as c').where('c.slug', slug)
            .whereNull('c.deleted_at').first('id', 'id_parent');

        if (exists) {

            if (exists.id_parent === default_uuid) {
                response.parentCategory = exists.id;
            } else {

                let getParent = await link
                    .from('categories as c').where('c.id', exists.id_parent)
                    .whereNull('c.deleted_at').first('id', 'id_parent');

                if (getParent) {
                    response.parentCategory = getParent.id;
                }

                response.subCategory.push(exists.id);
            }

        }    
    
        return response;
    }

    return model;
}
