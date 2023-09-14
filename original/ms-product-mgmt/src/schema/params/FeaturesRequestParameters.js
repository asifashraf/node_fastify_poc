module.exports = (opts) => {
    const {
        Joi
    } = opts;

    const getAllFeaturesRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                id_feature_group: Joi.array().items(Joi.string().guid()),
                keyword: Joi.string().allow('').trim(),
            })
        })
    }

    const createFeatureRequestBody = () => {
        return Joi.object().keys({
            feature: Joi.object().keys({
                id_feature_group: Joi.string().guid().required(),
                name: Joi.string().required().trim(),
                name_ar: Joi.string().required().trim(),
            })
        })
    }

    const updateFeatureRequestBody = () => {
        return Joi.object().keys({
            feature: Joi.object().keys({
                id: Joi.string().guid().required(),
                id_feature_group: Joi.string().guid(),
                name: Joi.string().trim(),
                name_ar: Joi.string().trim(),
                active: Joi.boolean().optional(),
            })
            // At least one of these keys must be in the object to be valid.
            .or('name', 'name_ar', 'id_feature_group','active')
            .required()
        })
    }

    const getFeatureDetailsRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required(),
        })
    }

    const deleteFeatureRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        getAllFeaturesRequestBody,
        createFeatureRequestBody,
        deleteFeatureRequestBody,
        updateFeatureRequestBody,
        getFeatureDetailsRequestBody
    }

}
