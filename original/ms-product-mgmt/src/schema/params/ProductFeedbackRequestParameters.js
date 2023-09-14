module.exports = (opts) => {
    const {
        Joi
    } = opts;

    const productFeedbackRequestBody = () => {
        return Joi.object().keys({
            feedback: Joi.object().keys({
                id_product: Joi.string().guid().required(),
                id_order: Joi.string().guid().required(),
                score: Joi.number().integer(),
                comment: Joi.string()
            })
        })
    }


    return {
        productFeedbackRequestBody
    }

}
