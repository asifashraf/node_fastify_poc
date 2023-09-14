module.exports = (opts) => {
    const {
        Joi
    } = opts;

    const getAllFeatureValuesRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                id_feature: Joi.array().items(Joi.string().guid()),
                keyword: Joi.string().allow('').trim(),
            })
        })
    }

    const createFeatureValueRequestBody = () => {
        return Joi.object().keys({
            featureValue: Joi.object().keys({
                id_feature: Joi.string().guid().required(),
                name: Joi.string().required().trim(),
                name_ar: Joi.string().required().trim(),
            })
        })
    }

    const updateFeatureValueRequestBody = () => {
        return Joi.object().keys({
            featureValue: Joi.object().keys({
                id: Joi.string().guid().required(),
                id_feature: Joi.string().guid(),
                name: Joi.string().trim(),
                name_ar: Joi.string().trim(),
                active: Joi.boolean().optional(),
            })
             // At least one of these keys must be in the object to be valid.
             .or('id_feature', 'name', 'name_ar', 'active')
             .required()
        })
    }

    const deleteFeatureValueRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    const getFeatureValueRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required(),
        })
    }

    return {
        getAllFeatureValuesRequestBody,
        createFeatureValueRequestBody,
        deleteFeatureValueRequestBody,
        updateFeatureValueRequestBody,
        getFeatureValueRequestBody
    }

}
