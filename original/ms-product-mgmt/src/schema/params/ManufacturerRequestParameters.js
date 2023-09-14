module.exports = (opts) => {
    const {
        Joi
    } = opts;

    const getAllManufacturersRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                active: Joi.boolean(),
                id_manufacturer: Joi.array().items(Joi.string().guid()),
                keyword: Joi.string().allow('').trim(),
            })
        })
    }

    const createManufacturerRequestBody = () => {
        return Joi.object().keys({
            manufacturer: Joi.object().keys({
                name: Joi.string().required().trim(),
                name_ar: Joi.string().required().trim(),
                image: Joi.string().optional(),
                image_ar: Joi.string().optional(),
            })
        })
    }

    const updateManufacturerRequestBody = () => {
        return Joi.object().keys({
            manufacturer: Joi.object().keys({
                id: Joi.string().guid().required(),
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
                meta_keywords_ar: Joi.string()
            })
            // At least one of these keys must be in the object to be valid.
            .or('name', 'image', 'active', 'description', 'meta_title', 'meta_description', 'meta_keywords',
                'name_ar', 'image_ar', 'description_ar', 'meta_title_ar', 'meta_description_ar', 'meta_keywords_ar')
            .required()
        })
    }

    const deleteManufacturerRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        getAllManufacturersRequestBody,
        createManufacturerRequestBody,
        deleteManufacturerRequestBody,
        updateManufacturerRequestBody
    }

}
