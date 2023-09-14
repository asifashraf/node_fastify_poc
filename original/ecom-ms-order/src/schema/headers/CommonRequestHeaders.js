module.exports = function CommonRequestHeaders(opts) {
    const { Joi } = opts;

    return {
        defaultHeaders: () => {
            return Joi.object().keys({
                'locale': Joi.string().optional(),
                'country-iso' : Joi.string().optional(),
                'city' :  Joi.string().allow('').optional()
            }).options({ allowUnknown: true })
        },

        authHeader: () => {
            return Joi.object().keys({
                'cofe-customer-token': Joi.string().required(),
                'locale': Joi.string().optional(),
                'country-iso' : Joi.string().optional(),
                'city' :  Joi.string().allow('').optional()
            }).options({ allowUnknown: true })
        },
    }
}
