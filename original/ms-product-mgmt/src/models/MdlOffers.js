module.exports = function MdlOffers(opts) {

    const { config, baseModel, guid, fs, moment, mdlProducts, mdlCategoryProducts, i18n, Aws, parseCsv, knexnest, imageUpload, XLSX } = opts;

    const model = baseModel('offers');

    const { link } = model;

    const { languages, default_uuid, offer_bucket, cloudfront_url, percentageIcon, sesKeys, emailSender, isProd } = config;

    const { uploadToS3 } = imageUpload

    model.createOffer = async function createOffer(offer) {

        const { 
            name,
            date_from,
            date_to,
            offer_type,
            country_iso,
            id_country,
            offer_tag,
            offer_tag_ar,
            offer_desc,
            offer_desc_ar,
            offer_icon,
            offer_desc_icon,
            active,
            products,
            file_name,
            categories,
            id_categories,
            suppliers,
            id_suppliers,
            manufacturers,
            id_manufacturers,
            exclude_with_existing_offers,
            exclude_with_existing_discounts,
            user
        } = offer;

        const id = guid.v4()

        let offerMetadata = null

        let offerProducts = []
        let offerCategories = []
        let offerSuppliers = []
        let offerManufacturers = []

        const errors = []

        const filteredCountry = await mdlCategoryProducts.getCountries([country_iso]);

        let idCountry = filteredCountry[0].id;

        if (categories) {

           let categoryProducts = await link.select('p.id_product')
                .from('product_category as p')
                .innerJoin('product_countries as pc', 'p.id_product', 'pc.id_product')
                .where('pc.id_country', idCountry)
                .whereIn('p.id_category', id_categories)

            if (categoryProducts.length) {

                offerCategories = id_categories.map((category) => {
                    return {
                        id_offer: id,
                        id_category: category,
                    }
                })

                categoryProducts = categoryProducts.map((product) => product.id_product)
                offerProducts = offerProducts.concat(categoryProducts)
            }
        }

        if (suppliers) {

            let supplierProducts = await link.select('ps.id_product')
                .from('product_suppliers as ps')
                .innerJoin('product_countries as pc', 'ps.id_product', 'pc.id_product')
                .where('pc.id_country', idCountry)
                .whereIn('ps.id_supplier', id_suppliers)
 
            if (supplierProducts.length) {

                offerSuppliers = id_suppliers.map((supplier) => {
                    return {
                        id_offer: id,
                        id_supplier: supplier,
                    }
                })

                supplierProducts = supplierProducts.map((product) => product.id_product)
                offerProducts = offerProducts.concat(supplierProducts)
            }
        }

        if (manufacturers) {

            let manufacturerProducts = await link.select('p.id')
                .from('products as p')
                .innerJoin('product_countries as pc', 'p.id', 'pc.id_product')
                .whereIn('p.id_manufacturer', id_manufacturers)
                .where('pc.id_country', idCountry)
                .whereNull('deleted_at').where({ active: true })
            
            if (manufacturerProducts.length) {

                offerManufacturers = id_manufacturers.map((manufacturer) => {
                    return {
                        id_offer: id,
                        id_manufacturer: manufacturer,
                    }
                })

                manufacturerProducts = manufacturerProducts.map((product) => product.id)
                offerProducts = offerProducts.concat(manufacturerProducts)
            }
        }

        if (products && file_name) {

            const _products = await this.getObjectStreamSync(file_name);

            let result = await link.select('id as _id', 'reference as _reference', 'pc.id_country as _countries__country', 'active as _active', 'deleted_at as _deleted').from('products')
                            .whereIn('products.reference', _products)
                            .whereNull('products.deleted_at')
                            .leftJoin('product_countries as pc', 'pc.id_product', 'products.id')

            result = knexnest.nest(result)

            if(result) {
                for (const item of result) {

                    if (!item.active) {
                        errors.push({ SKU: item.reference, Reason: `Product is inactive.` })
                        item.remove = true

                    } else if (item.deleted) {
                        errors.push({ SKU: item.reference, Reason: `Product doesn't exist.` })
                        item.remove = true

                    } else if (item.countries && item.countries.length) {

                        const productCountries =  item.countries.map((item) => item.country )

                        if (!productCountries.includes(id_country)) {
                            errors.push({ SKU: item.reference, Reason: `Product belong to different country than the selected in the offer.` })
                            item.remove = true
                        }
                    } 
                }

                result = result.filter(product => {
                    return !product.remove;
                })

                if (result.length) {
                    offerProducts = offerProducts.concat(result.map((item) => item.id))
                }
            }
        }

        if (offerProducts.length) {

            offerProducts = [...new Set(offerProducts)]

            const now = moment().format('YYYY-MM-DD HH:mm:ss')

            const existingOffers = await link.first(link.raw('ARRAY_REMOVE(ARRAY_AGG(DISTINCT(op.id_product)), NULL) as products')).from('offer_products as op')
                                    .whereIn('op.id_product', offerProducts)
                                    .innerJoin('offers as o', 'o.id', 'op.id_offer')
                                    .where('o.active', true)
                                    .where('o.date_to', '>' ,now)

            if (existingOffers && existingOffers.products?.length) {

                if (exclude_with_existing_offers) {

                    offerProducts = offerProducts.filter(product => {
                        return !existingOffers.products.includes(product);
                    })

                    const existingProductReferences = await this.getProductExistingOffers(existingOffers.products)

                    for (const item of existingProductReferences) {
                        errors.push({ SKU: item.reference, Reason: `The product exists in different offer ${item.name}.` })
                    }
                }
                else {

                    const productsToReplace = offerProducts.filter(product => {
                        return existingOffers.products.includes(product);
                    })

                    await link('offer_products')
                        .del()
                        .whereIn('id_product', productsToReplace)
                }
            }

            if (exclude_with_existing_discounts) {
                let now = moment()
                let formatted = now.format('YYYY-MM-DD HH:mm:ss')

                let discountedProducts = await link.select('id_product').from('product_specific_price as psp')
                                                .whereIn('id_product', offerProducts)
                                                .whereNull('deleted_at')
                                                .where(function (q) {
                                                    q.where('psp.date_from', '<=', formatted).where('psp.date_to', '>=', formatted)
                                                }).orWhereNull('psp.date_from','psp.date_to')
                                                .where('reduction', '>', 0)
                                                .where('active', true)
                                                .where('id_cart', default_uuid)

                if (discountedProducts.length) {

                    discountedProducts = discountedProducts.map((product) => product.id_product)

                    offerProducts = offerProducts.filter(product => {
                        return !discountedProducts.includes(product);
                    })

                    const discountedProductReferences = await this.getProductExistingOffers(discountedProducts)

                    for (const item of discountedProductReferences) {
                        errors.push({ SKU: item.reference, Reason: `Product has a discount` })
                    }
                }
            }

            if (errors.length) {

                const fileName = 'status.csv'
                const basePath =  process.env.AWS_S3_BASE_PATH
                const path =  `${basePath}/errors/`

                if (!fs.existsSync(fileName)) {

                    const writeStream = fs.createWriteStream(fileName);
                    writeStream.write(`SKU,Error  \n`);
                    for (const error of errors) {
                        writeStream.write(`${error.SKU},${error.Reason}` + '\n');
                    }

                    writeStream.end()

                    writeStream.on('finish', async() => {
                        const file = fs.readFileSync(fileName)
                        fs.unlinkSync(fileName)
                        const response = await uploadToS3({ path: `${path}${guid.v4()}.csv`, file, mimeType: 'text/csv' })

                        if (user && user.email) {

                            const params = {
                                subject: 'Product status',
                                html: response.Location, // template to be added later
                                receivers: [ user.email ]
                            }
    
                            this.sendMail(params)
                        }
                    })
                }
            }

            if (!offerProducts.length){
                throw new Error(`All products are associated with existing offers.`)
            }

            mdlProducts.productToAlgolia(offerProducts)

            offerProducts = offerProducts.map((product) => {
                return {
                    id_product: product,
                    id_offer: id,
                }
            })

            await link('offer_products').insert(offerProducts)

            if (offerCategories.length)
                await link('offer_categories').insert(offerCategories)

            if (offerSuppliers.length)
                await link('offer_suppliers').insert(offerSuppliers)

            if (offerManufacturers.length)
                await link('offer_manufacturers').insert(offerManufacturers)

            const [ _offer ] = await this.insert({
                id, 
                name,
                date_from,
                date_to,
                offer_type,
                active,
                country_iso,
                file_name,
                exclude_with_existing_offers,
                exclude_with_existing_discounts,
            }, 'id');
        
            offerMetadata = await link('offers_metadata').insert([
                { id: guid.v4(), id_offer: id, offer_tag, offer_desc, offer_icon, offer_desc_icon, id_lang: languages.en },
                { id: guid.v4(), id_offer: id, offer_tag: offer_tag_ar, offer_desc: offer_desc_ar, offer_icon, offer_desc_icon, id_lang: languages.ar },
            ], '*');
        }

        return { data: { id, offerMetadata } };
    }

    model.getProductExistingOffers = async function getProductExistingOffers(products) {

        return await link.select('reference','o.name').from('products')
                        .whereIn('products.id', products)
                        .leftJoin('offer_products as op', 'op.id_product', 'products.id')
                        .leftJoin('offers as o', 'o.id', 'op.id_offer')
    }

    model.updateOffer = async function updateOffer(offer) {

        const { 
            id,
            name,
            date_from,
            date_to,
            offer_type,
            country_iso,
            id_country,
            offer_tag,
            offer_tag_ar,
            offer_desc,
            offer_desc_ar,
            offer_icon,
            offer_desc_icon,
            active,
            products,
            file_name,
            categories,
            id_categories,
            suppliers,
            id_suppliers,
            manufacturers,
            id_manufacturers,
            exclude_with_existing_offers,
            exclude_with_existing_discounts,
            user,
        } = offer;

        const offerKeys = [
            'name',
            'date_from',
            'date_to',
            'offer_type',
            'country_iso',
            'offer_tag',
            'offer_tag_ar',
            'offer_desc',
            'offer_desc_ar',
            'offer_icon',
            'offer_desc_icon',
            'active',
            'products',
            'file_name',
            'categories',
            'id_categories',
            'suppliers',
            'id_suppliers',
            'manufacturers',
            'id_manufacturers',
            'exclude_with_existing_offers',
            'exclude_with_existing_discounts',
        ]

        let toUpdate = false

        for (key of offerKeys){
            if (offer.hasOwnProperty(key)){
                toUpdate = true
                break
            }
        }

        if (toUpdate){

            const updatedOffer = await this.update({
                name,
                date_from,
                date_to,
                offer_type,
                country_iso,
                active,
                file_name: file_name ? file_name : null,
                exclude_with_existing_offers,
                exclude_with_existing_discounts,
                updated_at: this.now()
            },
            {
                id,
                deleted_at: null
            });

            if (!updatedOffer?.length){
                throw new Error(`offer_not_exists`)
            }
        }

        let offerMetadata = {}

        if ( offer_tag || offer_desc  || offer_icon || offer_desc_icon ){
            offerMetadata = await link('offers_metadata')
                .where({ id_offer: id, id_lang: languages.en })
                .update({ offer_tag, offer_desc, offer_icon, offer_desc_icon })
                .returning('*')
        }

        if ( offer_tag_ar || offer_desc_ar || offer_icon || offer_desc_icon ) {
            offerMetadata = await link('offers_metadata')
                .where({ id_offer: id, id_lang: languages.ar })
                .update({ offer_tag: offer_tag_ar, offer_desc: offer_desc_ar, offer_icon, offer_desc_icon })
                .returning('*')
        }

        let offerCategories = []
        let offerProducts = []
        let offerSuppliers = []
        let offerManufacturers = []
        const errors = []

        const filteredCountry = await mdlCategoryProducts.getCountries([country_iso]);

        let idCountry = filteredCountry[0].id;

        await link('offer_products').del().where('id_offer', id)

        if (categories && id_categories && id_categories.length) {

            await link('offer_categories').del().where('id_offer', id)

            let categoryProducts = await link.select('p.id_product')
                .from('product_category as p')
                .innerJoin('product_countries as pc', 'p.id_product', 'pc.id_product')
                .where('pc.id_country', idCountry)
                .whereIn('p.id_category', id_categories)

            if (categoryProducts.length) {

                offerCategories = id_categories.map((category) => {
                    return {
                        id_offer: id,
                        id_category: category,
                    }
                })

                categoryProducts = categoryProducts.map((product) => product.id_product)
                offerProducts = offerProducts.concat(categoryProducts)
            }
        
        } else {
            await link('offer_categories').del().where('id_offer', id)
        }

        if (suppliers && id_suppliers && id_suppliers.length) {

            await link('offer_suppliers').del().where('id_offer', id)

            let supplierProducts = await link.select('ps.id_product')
                .from('product_suppliers as ps')
                .innerJoin('product_countries as pc', 'ps.id_product', 'pc.id_product')
                .where('pc.id_country', idCountry)
                .whereIn('ps.id_supplier', id_suppliers)

 
            if (supplierProducts.length) {

                offerSuppliers = id_suppliers.map((supplier) => {
                    return {
                        id_offer: id,
                        id_supplier: supplier,
                    }
                })

                supplierProducts = supplierProducts.map((product) => product.id_product)
                offerProducts = offerProducts.concat(supplierProducts)
            }
        } else {
            await link('offer_suppliers').del().where('id_offer', id)
        }

        if (manufacturers && id_manufacturers && id_manufacturers.length) {

            await link('offer_manufacturers').del().where('id_offer', id)
            
            let manufacturerProducts = await link.select('p.id')
                .from('products as p')
                .innerJoin('product_countries as pc', 'p.id', 'pc.id_product')
                .whereIn('p.id_manufacturer', id_manufacturers)
                .where('pc.id_country', idCountry)
                .whereNull('deleted_at').where({ active: true })

            if (manufacturerProducts.length) {

                offerManufacturers = id_manufacturers.map((manufacturer) => {
                    return {
                        id_offer: id,
                        id_manufacturer: manufacturer,
                    }
                })

                manufacturerProducts = manufacturerProducts.map((product) => product.id)
                offerProducts = offerProducts.concat(manufacturerProducts)
            }
        } else {
            await link('offer_manufacturers').del().where('id_offer', id)
        }

        if (products && file_name) {

            const _products = await this.getObjectStreamSync(file_name);

            let result = await link.select('id as _id', 'reference as _reference', 'pc.id_country as _countries__country', 'active as _active', 'deleted_at as _deleted').from('products')
                            .whereIn('products.reference', _products)
                            .whereNull('products.deleted_at')
                            .leftJoin('product_countries as pc', 'pc.id_product', 'products.id')

            result = knexnest.nest(result)

            if(result) {
                for (const item of result) {

                    if (!item.active) {
                        errors.push({ SKU: item.reference, Reason: `Product is inactive.` })
                        item.remove = true

                    } else if (item.deleted) {
                        errors.push({ SKU: item.reference, Reason: `Product doesn't exist.` })
                        item.remove = true

                    } else if (item.countries && item.countries.length) {

                        const productCountries =  item.countries.map((item) => item.country )

                        if (!productCountries.includes(id_country)) {
                            errors.push({ SKU: item.reference, Reason: `Product belong to different country than the selected in the offer.` })
                            item.remove = true
                        }
                    } 
                }

                result = result.filter(product => {
                    return !product.remove;
                })

                if (result.length) {
                    offerProducts = offerProducts.concat(result.map((item) => item.id))
                    await link('offer_products').del().where('id_offer', id)
                }
            }
        }

        if (offerProducts.length) {

            offerProducts = [...new Set(offerProducts)]

            const now = moment().format('YYYY-MM-DD HH:mm:ss')

            const existingOffers = await link.first(link.raw('ARRAY_REMOVE(ARRAY_AGG(DISTINCT(op.id_product)), NULL) as products')).from('offer_products as op')
                                        .whereIn('op.id_product', offerProducts)
                                        .innerJoin('offers as o', 'o.id', 'op.id_offer')
                                        .where('o.active', true)
                                        .where('o.date_to', '>' ,now)

            if (existingOffers && existingOffers.products?.length) {

                if (exclude_with_existing_offers) {

                    offerProducts = offerProducts.filter(product => {
                        return !existingOffers.products.includes(product);
                    })

                    const existingProductReferences = await this.getProductExistingOffers(existingOffers.products)

                    for (const item of existingProductReferences) {
                        errors.push({ SKU: item.reference, Reason: `The product exists in different offer ${item.name}.` })
                    }
                }
                else {

                    const productsToReplace = offerProducts.filter(product => {
                        return existingOffers.products.includes(product);
                    })

                    await link('offer_products')
                        .del()
                        .whereIn('id_product', productsToReplace)
                }
            }

            if (exclude_with_existing_discounts) {
                let now = moment()
                let formatted = now.format('YYYY-MM-DD HH:mm:ss')

                let discountedProducts = await link.select('id_product').from('product_specific_price as psp')
                                                .whereIn('id_product', offerProducts)
                                                .whereNull('deleted_at')
                                                .where(function (q) {
                                                    q.where('psp.date_from', '<=', formatted).where('psp.date_to', '>=', formatted)
                                                }).orWhereNull('psp.date_from','psp.date_to')
                                                .where('reduction', '>', 0)
                                                .where('active', true)
                                                .where('id_cart', default_uuid)

                if (discountedProducts.length) {

                    discountedProducts = discountedProducts.map((product) => product.id_product)

                    offerProducts = offerProducts.filter(product => {
                        return !discountedProducts.includes(product);
                    })

                    const discountedProductReferences = await this.getProductExistingOffers(discountedProducts)

                    for (const item of discountedProductReferences) {
                        errors.push({ SKU: item.reference, Reason: `Product has a discount` })
                    }
                }
            }

            if (errors.length) {

                const fileName = 'status.csv'
                const basePath =  process.env.AWS_S3_BASE_PATH
                const path =  `${basePath}/errors/`

                if (!fs.existsSync(fileName)) {

                    const writeStream = fs.createWriteStream(fileName);
                    writeStream.write(`SKU,Error  \n`);
                    for (const error of errors) {
                        writeStream.write(`${error.SKU},${error.Reason}` + '\n');
                    }

                    writeStream.end()

                    writeStream.on('finish', async() => {
                        const file = fs.readFileSync(fileName)
                        fs.unlinkSync(fileName)
                        const response = await uploadToS3({ path: `${path}${guid.v4()}.csv`, file, mimeType: 'text/csv' })

                        if (user && user.email) {

                            const params = {
                                subject: 'Product status',
                                html: response.Location, // template to be added later
                                receivers: [ user.email ]
                            }
    
                            this.sendMail(params)
                        }
                    })
                }
            }

            if (!offerProducts.length){
                throw new Error(`All products are associated with existing offers.`)
            }

            mdlProducts.productToAlgolia(offerProducts)

            offerProducts = offerProducts.map((product) => {
                return {
                    id_product: product,
                    id_offer: id,
                }
            })
          
            await link('offer_products').insert(offerProducts)

            if (offerCategories.length)
                await link('offer_categories').insert(offerCategories)

            if (offerSuppliers.length)
                await link('offer_suppliers').insert(offerSuppliers)

            if (offerManufacturers.length)
                await link('offer_manufacturers').insert(offerManufacturers)
        }

        offerMetadata = await link('offers_metadata').where({ id_offer: id }).select('*')

        return { data: { id, offerMetadata } };
    }

    model.getAll = async function getAll(filters, pagination, i8ln) {

        const { perPage, currentPage, paginate } = pagination;

        const { status, expired, keyword, date_from, date_to, offer_type } = filters

        const { countryIso } = i8ln

        const response = { data: null, pagination: null }
        
        let _link = link.select(
            'o.id',
            'o.offer_type',
            'o.date_from',
            'o.date_to',
            'o.name',
            'o.active'
        )
        .from('offers as o')
        .leftJoin('offer_products as op', 'op.id_offer', 'o.id')
        .whereNull('o.deleted_at')
        .count('op.id_product as product_count')
        .where('o.country_iso', countryIso)
        .orderBy('o.created_at', 'desc')
        .groupBy('o.id')

        if (keyword) {
            _link = _link.where('o.name', 'Ilike', '%' + keyword + '%')
        }

        if (status === 'active') {
            
            _link = _link
                        .where('o.date_from', '<=', moment.utc())
                        .where('o.date_to', '>=', moment.utc())
                        .where('o.active', true)
                        .select(link.raw('? as status', [status]))
        } 
        else if (status === 'inactive') {

            _link = _link.where(function (q) {
                q.where(function (q) {
                    q.where('o.date_from', '>=', moment.utc())
                }).orWhere('o.active', false)
            }).select(link.raw('? as status', [status]))

        }
        else if (status === 'expired') {
            _link = _link
                        .where('o.date_to', '<', moment.utc())
                        .select(link.raw('? as status', [status]))
        }

        if (offer_type) {
            _link = _link.where('o.offer_type', offer_type)
        }

        if (date_from && !date_to) {
            const date = moment(date_from).startOf('day').utc()

            _link = _link.where(function (q) {
                        q.where("o.date_from", ">=", date);
                    })
        }

        if (!date_from && date_to) {
            const date = moment(date_to).endOf('day').utc()

            _link = _link.where(function (q) {
                        q.where("o.date_to", "<=", date);
                    })
        }
        
        if (date_from && date_to) {
            const dateFrom = moment(date_from).startOf('day').utc()
            const dateTo = moment(date_to).endOf('day').utc()

            _link = _link
                .where(function (q) {
                    q.where("o.date_from", ">=", dateFrom).where(
                        "o.date_to", "<=", dateTo
                    );
                })
        }

        if (paginate)
            _link = _link.paginate({ perPage, currentPage, isLengthAware: true });

        let result = await _link;

        if (paginate) {
            response.data = result.data
            response.pagination = result.pagination
        } else {
            response.data = result
        }

        if (!status && response.data && response.data.length) {

            let _rules = response.data.map(async (ele) => {
                
                if (ele.active === false || moment().isBefore(ele.date_from)) {
                    ele.status = 'inactive'
                } else if (moment().isBetween(ele.date_from, ele.date_to)) {
                    ele.status = 'active'
                } else if (moment().isAfter(ele.date_to)){
                    ele.status = 'expired'
                }
            
                return ele;
            });

            response.data = await Promise.all(_rules);
        }

        return response
    }

    model.offersWithMaxDiscount = async function offersWithMaxDiscount(i8ln) {
        
        const { countryIso, locale } = i8ln

        const countryDetail = await mdlCategoryProducts.getCountries([countryIso]);

        let idCountry = countryDetail[0].id;

        const response = { data: null }  

        let now = moment();
        let formatted = now.format('YYYY-MM-DD HH:mm:ss');

        let _link = link
            .select(
                'o.id as id',
                'om.offer_tag as offerTag',
                'o.offer_type as offerType',
                'om.offer_icon as offerIcon',
                'om.offer_desc_icon as offerDescIcon'
            )
            .from('offers as o')
            .innerJoin('offers_metadata as om', 'o.id', 'om.id_offer')
            .innerJoin('offer_products as op', 'o.id', 'op.id_offer')
            .where(function (q) {
                q.where(function (q) {
                    q.where('o.date_from', '<=', formatted).where('o.date_to', '>=', formatted)
                }).orWhereNull('o.date_from','o.date_to')
            })
            .where({'o.country_iso': countryIso, 'o.active': true, 'om.id_lang': locale })
            .whereNull('o.deleted_at')
            .orderBy('o.created_at', 'desc')
           
        let offers = await _link;

        if (offers && offers.length > 0) {

            offers = [...new Map(offers.map(item => [item['offerTag'], item])).values()];

            let _offers = offers.map(async (item) => {
        
                let checkAvaiableProducts = await link.from('offer_products as op')
                    .innerJoin('products as p', 'op.id_product', 'p.id')
                    .where('op.id_offer', item.id).where({'p.active': true, 'p.approval_status': 'Approved'}).whereNull('p.deleted_at').pluck('p.id') 

                if (checkAvaiableProducts.length === 0) {
                    return null; // remove this offer Tag
                }

                item.offerIcon = (item.offerDescIcon) ? `${cloudfront_url}${offer_bucket}${item.offerDescIcon}` : null;
             
                return item;
            });

            offers = await Promise.all(_offers);
            offers = offers.filter(item => item !== null); // remove null values from the array
        }

        /** Get Current Available Max Discount */
           
        let maxDiscount = await link
            .from('product_specific_price as psp')
            .innerJoin('products as p', 'p.id', 'psp.id_product')
            .where(function (q) {
                q.where(function (q) {
                    q.where('psp.date_from', '<=', formatted).where('psp.date_to', '>=', formatted)
                }).orWhereNull('psp.date_from','psp.date_to')
            }).where({ 'psp.active': true, 'psp.id_cart': default_uuid, 'psp.id_country': idCountry, 'p.active': true, 'p.approval_status': 'Approved'})
            .whereNull('psp.deleted_at')
            .whereNull('p.deleted_at')
            .max('psp.reduction_percentage as discount').first()

        if (maxDiscount && maxDiscount.discount !== null) {

            maxDiscount = (maxDiscount.discount*100).toFixed(0);
           
            var discount = {};

            discount['id'] = "discounted_offer",
            discount['offerTag'] = i18n.__('discounts_upto', maxDiscount+'%'),
            discount['offerType'] = 'upto',
            discount['offerIcon'] = `${cloudfront_url}${offer_bucket}${percentageIcon}`,
  
            offers.push(discount);     
        }

        response.data = offers

        return response

    }

    model.view = async function view (id) {

        const [ offer ] = await link('offers as o').select(
                            'o.*',  
                            link.raw('ARRAY_REMOVE(ARRAY_AGG(DISTINCT(oc.id_category)), NULL) as id_categories'),
                            link.raw('ARRAY_REMOVE(ARRAY_AGG(DISTINCT(om.id_manufacturer)), NULL) as id_manufacturers'),
                            link.raw('ARRAY_REMOVE(ARRAY_AGG(DISTINCT(os.id_supplier)), NULL) as id_suppliers'),
                        )
                        .where({
                            id,
                            deleted_at: null
                        })
                        .leftJoin('offer_categories as oc', 'oc.id_offer', 'o.id')
                        .leftJoin('offer_manufacturers as om', 'om.id_offer', 'o.id')
                        .leftJoin('offer_suppliers as os', 'os.id_offer', 'o.id')
                        .groupBy('o.id')   

        if (!offer) {
            throw new Error(`offer_not_exists`)
        }

        const offerMetadata = await link.select('*').from('offers_metadata as om').where({ id_offer: id })

        const englishMeta = offerMetadata.find((meta) => meta.id_lang === languages.en)
        const arabicMeta = offerMetadata.find((meta) => meta.id_lang === languages.ar)

        offer.offer_tag = englishMeta.offer_tag
        offer.offer_tag_ar = arabicMeta.offer_tag
        offer.offer_desc = englishMeta.offer_desc
        offer.offer_desc_ar = arabicMeta.offer_desc
        offer.offer_icon = arabicMeta.offer_icon
        offer.offer_desc_icon = arabicMeta.offer_desc_icon

        if (offer.id_categories.length) {

            let existingCategories = await link.from('categories')
                    .whereIn('id', offer.id_categories).where('active', true).whereNull('deleted_at').pluck('id')

            if (existingCategories && existingCategories.length) {
                offer.categories = true;
                offer.id_categories = existingCategories;
            } else {
                offer.id_categories = [];
            }
        }

        if (offer.id_suppliers.length) {

            let existingSupplier = await link.from('suppliers')
                .whereIn('id', offer.id_suppliers).where('active', true).whereNull('deleted_at').pluck('id')

            if (existingSupplier && existingSupplier.length) {
                offer.suppliers = true;
                offer.id_suppliers = existingSupplier;
            } else {
                offer.id_suppliers = [];
            }
        }

        if (offer.id_manufacturers.length) {

            let existingManufacturer = await link.from('manufacturers')
                .whereIn('id', offer.id_manufacturers).where('active', true).whereNull('deleted_at').pluck('id')

            if (existingManufacturer && existingManufacturer.length) {
                offer.manufacturers = true;
                offer.id_manufacturers = existingManufacturer;
            } else {
                offer.id_manufacturers = [];
            }
        }

        if (offer.file_name) {
            offer.products = true
            offer.file_name = `${cloudfront_url}offers/${offer.file_name}`
        }
        
        return { data: offer }
    }

    model.deleteOffer = async function deleteOffer(id) {
       
        const deleted = await this.softDelete(
            {
                id,
                deleted_at: null
            },
            { active: false }
        );

        if (!deleted?.length){
            throw new Error(`invalid_promo`)
        }

        const offerProducts = await link.from('offer_products').where('id_offer', id).pluck('id_product')

        if (offerProducts.length > 0) { 
            await link('offer_products').del().where('id_offer', id);
            await link('offer_suppliers').del().where('id_offer', id);
            await link('offer_manufacturers').del().where('id_offer', id);
            
            mdlProducts.productToAlgolia(offerProducts)
        }

       return deleted
    }

    model.getObjectStreamSync = async function getObjectStreamSync(file_name) {

        return new Promise((resolve, reject) => {

            const fileType = file_name.split('.').pop()

            let baseUrl = 'ecom/development/offers';
            
            if (isProd)
                baseUrl = 'ecom/production/offers';
            
            const Key = `${baseUrl}/${file_name}`

            const tempFilePath = `${process.cwd()}/products.txt`

            const region = process.env.REGION
            const bucket = process.env.S3_BUCKET_NAME
            const accessKeyId =  process.env.AWS_S3_ACCESS_KEY
            const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY
        
            const params = {
                Key,
                Bucket: bucket
            }

            const s3 = new Aws.S3({
                region,
                signatureVersion: 'v4',
                accessKeyId,
                secretAccessKey,
            })

            // create read stream for object
            let stream = s3.getObject(params).createReadStream();

            const fileStream = fs.createWriteStream(tempFilePath);
            stream.pipe(fileStream);

            if (fileType === 'csv') {
                const csvData = []

                stream
                    .pipe(parseCsv())
                    .on('data', (data) => {
                        csvData.push(data.SKU)
                    })
                    .on('end',function(){
                        resolve(csvData)
                        fs.unlinkSync(tempFilePath)
                    })
            } else {

                const buffers = []

                stream.on("data", function(data) { 
                    buffers.push(data)
                })

                stream.on("end", function() {
                    const buffer = Buffer.concat(buffers);
                    const workbook = XLSX.read(buffer, {type:"buffer"});

                    let products = []

                    workbook.SheetNames.forEach(function(sheetName) {
                        const XL_row_object = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        
                        products = [ ...products, ... XL_row_object.map((product) => product.SKU ) ]
                    })

                    resolve(products);
                });
            }

            // on error reject the Promise
            stream.on('error', (err) => {
                fs.unlinkSync(tempFilePath)
                reject(new Error(err))
            });
        })
    }

    model.sendMail = async function sendMail(params) {

        Aws.config.update({
            accessKeyId: sesKeys.accessKeyId,
            secretAccessKey: sesKeys.secretAccessKey,
            region: sesKeys.region,
        });

        const ses = new Aws.SES({ apiVersion: '2010-12-01' })

        const Charset = 'UTF-8'

        const Subject =  {
            Charset,
            Data: params.subject
        }

        const Html = {
            Charset,
            Data: params.html
        }

        const payload = {
            Destination: {
                ToAddresses: params.receivers
            },
            Message: {
                Body: {
                    Html,
                },
                Subject,
            },
            ReturnPath: emailSender,
            Source: emailSender,
        }

        ses.sendEmail(payload, (err, data) => {
            if (err) {
                return console.log(err,'err');
            } else {
                console.log("Email sent to", params.receivers , data);
            }
        })

    }

    return model;
}
