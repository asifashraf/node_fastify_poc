module.exports = (opts) => {
    const {
        Joi,
        config,
    } = opts;

    const { default_uuid } = config;

    const getAllCategoriesRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                active: Joi.boolean().optional(),
                id_parent: Joi.string().guid().default(default_uuid),
                id_category: Joi.array().items(Joi.string().guid()).optional(),
                keyword: Joi.string().allow('').trim(),
                subCategories: Joi.boolean().optional().default(true)
            }),
            fromDashboard: Joi.boolean().optional().default(false),
        })
    }

    const createCategoriesRequestBody = () => {
        return Joi.object().keys({
            category: Joi.object().keys({
                name: Joi.string().required().trim(),
                name_ar: Joi.string().required().trim(),
                description: Joi.string().required(),
                description_ar: Joi.string().required(),
                image: Joi.string().optional(),
                image_ar: Joi.string().optional(),
                id_parent: Joi.string().trim().optional().default(default_uuid),
            })
        })
    }

    const updateCategoriesRequestBody = () => {
        return Joi.object().keys({
            category: Joi.object().keys({
                id: Joi.string().guid().required(),
                id_parent: Joi.string().guid(),
                active: Joi.boolean(),
                name: Joi.string().trim(),
                name_ar: Joi.string().trim(),
                image: Joi.string(),
                image_ar: Joi.string(),
                description: Joi.string(),
                description_ar: Joi.string(),
                meta_title: Joi.string(),
                meta_title_ar: Joi.string(),
                meta_description: Joi.string(),
                meta_description_ar: Joi.string(),
                meta_keywords: Joi.string(),
                meta_keywords_ar: Joi.string(),
                subcategories: Joi.array().items(
                    {
                        id: Joi.string().guid().required(),
                        delete: Joi.boolean().optional().default(false)
                    },
                )
            })
            // At least one of these keys must be in the object to be valid.
            .or('name', 'image', 'active', 'description', 'meta_title', 'meta_description', 'meta_keywords',
                'name_ar', 'image_ar', 'description_ar', 'meta_title_ar', 'meta_description_ar', 'meta_keywords_ar')
            .required()
        })
    }

    const getCategoryFiltersRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                id_category: Joi.string().optional(),
                id_supplier: Joi.string().optional(),
                id_subcategory: Joi.array().items(Joi.string().guid()).optional().default([]),
                id_manufacturer: Joi.array().items(Joi.string().guid()).optional().default([]),
                prices: Joi.object().keys(
                    {
                        min_price: Joi.number().min(0).max(Joi.ref('max_price')).required(),
                        max_price: Joi.number().min(0).required()
                    }
                ).optional().default([]),
                features: Joi.array().items(
                    {
                        id_feature: Joi.string().guid().required(),
                        id_feature_value: Joi.array().items(Joi.string().guid()).required()
                    }
                ).optional(),
                offers: Joi.boolean(),
                slug_type: Joi.string(),
                slug: Joi.when('slug_type', {
                    is: Joi.string().required(),
                    then: Joi.string().required(),
                    otherwise: Joi.string()
                })
            })
        })
    }

    const deleteCategoryRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        getAllCategoriesRequestBody,
        createCategoriesRequestBody,
        getCategoryFiltersRequestBody,
        deleteCategoryRequestBody,
        updateCategoriesRequestBody
    }

}
