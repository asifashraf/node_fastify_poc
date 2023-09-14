module.exports = (opts) => {
    const {
        Joi,
        config
    } = opts;

    const { default_uuid } = config;

    const getAllProductsRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                active: Joi.boolean(),
                offerProducts: Joi.boolean(),
                approval_status: Joi.string(),
                id_product: Joi.array().items(Joi.string().guid()).default([]),
                keyword: Joi.string().allow('').trim(),
                id_manufacturer: Joi.array().items(Joi.string().guid()),
                slug_type: Joi.string(),
                slug: Joi.when('slug_type', {
                    is: Joi.string().required(),
                    then: Joi.string().required(),
                    otherwise: Joi.string()
                }),
                id_category: Joi.string(),
                id_subcategory: Joi.array().items(Joi.string().guid()).optional().default([]),
                id_supplier: Joi.string().guid(),
                sort_by: Joi.object().keys(),
                category: Joi.boolean(),
                price: Joi.object().keys(),
                variants: Joi.boolean(),
                country_iso: Joi.string().trim(),
                features: Joi.array().items({
                        id_feature: Joi.string().guid().required(),
                        id_feature_value: Joi.array().items(Joi.string().guid()).required()
                    }
                ).optional(),
                offerTags: Joi.array().items({
                    id: Joi.string(),
                    offerTag: Joi.string()
                }
            ).optional(),
            }),
            fromDashboard: Joi.boolean().optional().default(false),
        })
    }

    const getProductDetailRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().required(),
        })
    }

    const getProductDetailRequestQuery = () => {
        return Joi.object().keys({
            fromDashboard: Joi.boolean().default(false),
        })
    }

    const getSupplierProductDetailRequestBody = () => {
        return Joi.object().keys({
            id_products: Joi.array().items(Joi.string().guid()),
            id_suppliers: Joi.array().items(Joi.string().guid()),
        })
    }

    const createProductRequestBody = () => {
        return Joi.object().keys({
            product: Joi.object().keys({
                name: Joi.string().max(100).required().trim(),
                name_ar: Joi.string().max(100).required().trim(),
                short_description: Joi.string().required().trim(),
                short_description_ar: Joi.string().required().trim(),
                description: Joi.string().empty('').default(null),
                description_ar: Joi.string().empty('').default(null),
                reference: Joi.string().max(128).required().trim(),
                id_manufacturer: Joi.string().guid().required().trim(),
                id_category: Joi.string().guid().required().trim(),
                approval_status: Joi.string(),
                quantity: Joi.number().required().min(0).message("quantity must be greater than or equal to 0"),
                id_supplier: Joi.string().guid().required().trim(),
                priceTaxExcl: Joi.number().required().min(0).message("price must be greater than or equal to 0"),
                features: Joi.array().items({
                    id_feature: Joi.string().guid().required(),
                    id_feature_value: Joi.alternatives().try(
                        Joi.string().guid().required(),
                        Joi.string().max(50).trim()
                    ).required(),
                    id_feature_group: Joi.string().guid().required()
                }),
                images: Joi.array().items({
                    cover: Joi.boolean().required(),
                    alternate_cover: Joi.boolean().required(),
                    position: Joi.number().required(),
                    image: Joi.string().max(255).required()
                }),
                videos: Joi.array().items(Joi.string().max(255)).optional(),
                tags: Joi.array().items(Joi.string().max(255)).optional(),
                countries: Joi.array().items(Joi.string().guid()).optional(),
                variants: Joi.array().items({
                    reference: Joi.string().max(128).required().trim(),
                    price: Joi.number().required().min(0).message("price must be greater than or equal to 0"),
                    quantity: Joi.number().required().min(0).message("quantity must be greater than or equal to 0"),
                    default: Joi.boolean().optional().default(false),
                    allow_backorder: Joi.boolean().optional().default(false),
                    images: Joi.array().items(Joi.string().required()).optional(),
                    id_attributes: Joi.array().items(Joi.string().guid().required()).optional(),
                    reductionPrice: Joi.object().keys({
                        reductionValue: Joi.number().required(),
                        reductionPercentage: Joi.number(),
                        reductionType : Joi.string().valid('percentage','amount').required(),
                        from: Joi.date().required(),
                        to: Joi.date().greater(Joi.ref('from')).message("From date must be less than to date"),
                        active: Joi.boolean().optional().default(true),
                    }),
                }),
                reductionPrice:  Joi.object().keys({
                    reductionValue: Joi.number().required(),
                    reductionPercentage: Joi.number(),
                    reductionType : Joi.string().valid('percentage','amount').required(),
                    from: Joi.date().required(),
                    to: Joi.date().greater(Joi.ref('from')).message("From date must be less than to date"),
                    active: Joi.boolean().optional().default(true),
                })
            })
        })
    }

    const notifyMeAvailableRequestBody = () => {
        return Joi.object().keys({
            product: Joi.object().keys({
                id_product: Joi.string().guid().required(),
                id_product_attribute: Joi.string().guid().optional().default(default_uuid)
            })
        })
    }

    const updateProductRequestBody = () => {
        return Joi.object().keys({
            product: Joi.object().keys({
                id: Joi.string().guid().required(),
                name: Joi.string().max(100).trim(),
                name_ar: Joi.string().max(100).trim(),
                active: Joi.boolean(),
                description: Joi.string().allow('', null),
                description_ar: Joi.string().allow('', null),
                short_description: Joi.string(),
                short_description_ar: Joi.string(),
                approval_status: Joi.string(),
                reference: Joi.string().max(128).trim(),
                id_manufacturer: Joi.string().guid().trim(),
                id_category: Joi.string().guid().trim(),
                quantity: Joi.number().min(0).message("quantity must be greater than or equal to 0"),
                id_supplier: Joi.string().guid().trim(),
                priceTaxExcl: Joi.number().min(0).message("price must be greater than or equal to 0"),
                features: Joi.array().items({
                    id_feature: Joi.string().guid().required(),
                    id_feature_value: Joi.alternatives().try(
                        Joi.string().guid().required(),
                        Joi.string().max(50).trim()
                    ).required(),
                    id_feature_group: Joi.string().guid().required()
                }),
                images: Joi.array().items({
                    cover: Joi.boolean().required(),
                    alternate_cover: Joi.boolean().required(),
                    position: Joi.number().required(),
                    image: Joi.string().max(255).required()
                }),
                videos: Joi.array().items(Joi.string().max(255)).optional(),
                tags: Joi.array().items(Joi.string().max(255)).optional(),
                countries: Joi.array().items(Joi.string().guid()).optional(),
                reductionPrice: Joi.object().keys({
                    reductionValue: Joi.number().required(),
                    reductionPercentage: Joi.number(),
                    reductionType : Joi.string().valid('percentage','amount').required(),
                    from: Joi.date().required(),
                    to: Joi.date().greater(Joi.ref('from')).message("From date must be less than to date"),
                    active: Joi.boolean().optional().default(true),
                }).allow(null),
                variants: Joi.array().items({
                    id: Joi.string().guid(),
                    reference: Joi.string().max(128).required().trim(),
                    price: Joi.number().required().min(0).message("price must be greater than or equal to 0"),
                    quantity: Joi.number().required().min(0).message("quantity must be greater than or equal to 0"),
                    default: Joi.boolean().optional().default(false),
                    delete: Joi.boolean().optional().default(false),
                    allow_backorder: Joi.boolean().optional().default(false),
                    images: Joi.array().items(Joi.string().required()).optional(),
                    id_attributes: Joi.array().items(Joi.string().guid().required()).optional(),
                    reductionPrice: Joi.object().keys({
                        reductionValue: Joi.number().required(),
                        reductionPercentage: Joi.number(),
                        reductionType : Joi.string().valid('percentage','amount').required(),
                        from: Joi.date().required(),
                        to: Joi.date().greater(Joi.ref('from')).message("From date must be less than to date"),
                        active: Joi.boolean().optional().default(true),
                    }).allow(null),
                }),
            })
            // At least one of these keys must be in the object to be valid.
            .or('name', 'short_description','description',
                'name_ar', 'short_description_ar','description_ar',
                'reference','id_manufacturer','id_category','quantity','id_supplier', 'approval_status', 
                'priceTaxExcl','features','images','videos','tags','countries','active','reductionPrice','variants')
            .required()
        })
    }

    const updateProductsStockRequestBody = () => {
        return Joi.object().keys({
              products: Joi.array().items({
                    id_product: Joi.string().guid().required(),
                    id_product_attribute: Joi.string().guid().optional().default(default_uuid),
                    product_quantity:  Joi.number().required().min(0).message("quantity must be greater than or equal to 0"),
                }).required(),
            })
    }

    const deleteProductRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        getAllProductsRequestBody,
        createProductRequestBody,
        updateProductRequestBody,
        deleteProductRequestBody,
        getProductDetailRequestBody,
        notifyMeAvailableRequestBody,
        updateProductsStockRequestBody,
        getSupplierProductDetailRequestBody,
        getProductDetailRequestQuery,
    }

}
