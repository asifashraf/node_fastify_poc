module.exports = (opts) => {
    const {
        Joi
    } = opts;

    const createUserRequestBody = () => {
        return Joi.object().keys({
            user: Joi.object().keys({
                name: Joi.string().trim(),
            })
            .or('name')
            .required()
        })
    }

    return {
        createUserRequestBody
    }

}
