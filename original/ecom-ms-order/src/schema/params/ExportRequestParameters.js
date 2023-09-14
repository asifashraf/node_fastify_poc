module.exports = (opts) => {
    const {
        Joi,
    } = opts;

    const exportOrderListRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                keyword: Joi.string(),
                sort_by: Joi.object().keys(),
                startDate: Joi.date().iso(),
                endDate: Joi.date().iso(),
                id_supplier: Joi.string().guid(),
                countryIso: Joi.string().trim(),
                orderStatus: Joi.string().guid(),
            }),
            timezone: Joi.string(),
        })
    }

    return {
        exportOrderListRequestBody,
    }
}
