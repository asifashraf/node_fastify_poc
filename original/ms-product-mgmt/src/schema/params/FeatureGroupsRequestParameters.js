module.exports = (opts) => {
    const {
        Joi
    } = opts;

    const getAllFeatureGroupsRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                active: Joi.boolean(),
                id_feature_group: Joi.array().items(Joi.string().guid()),
                keyword: Joi.string().allow('').trim(),
            })
        })
    }

    const getFeatureGroupsRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required(),
        })
    }

    const createFeatureGroupRequestBody = () => {
        return Joi.object().keys({
            featureGroup: Joi.object().keys({
                name: Joi.string().required().trim(),
                name_ar: Joi.string().required().trim(),
            })
        })
    }

    const updateFeatureGroupRequestBody = () => {
        return Joi.object().keys({
            featureGroup: Joi.object().keys({
                id: Joi.string().guid().required(),
                name: Joi.string().optional().trim(),
                name_ar: Joi.string().optional().trim(),
                status: Joi.boolean().optional(),
            })
             // At least one of these keys must be in the object to be valid.
            .or('name', 'name_ar', 'status')
            .required()
        })
    }

    const deleteFeatureGroupRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        getAllFeatureGroupsRequestBody,
        createFeatureGroupRequestBody,
        deleteFeatureGroupRequestBody,
        updateFeatureGroupRequestBody,
        getFeatureGroupsRequestBody,
    }

}
