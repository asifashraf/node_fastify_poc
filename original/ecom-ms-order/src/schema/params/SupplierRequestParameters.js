module.exports = (opts) => {
    const {
        Joi,
    } = opts;

    const orderSupplierStatusUpdateRequestBody = () => {
        return Joi.object().keys({
            order: Joi.object().keys({
                id_order: Joi.string().guid().required(),
                id_status: Joi.string().guid().required(),
                id_supplier: Joi.string().guid().required(),
            }).required()
        })
    }

    const updateSupplierTrackingInfoRequestBody = () => {
        return Joi.object().keys({
            tracking: Joi.object().keys({
                id_order: Joi.string().guid().required(),
                id_supplier: Joi.string().guid().required(),
                id_carrier_partner: Joi.string().guid().required(),
                tracking_url: Joi.string().required(),
                tracking_number: Joi.string().required(),
                awb_filepath: Joi.string().optional(),

            }).required()
        })
    }

    const salasaTrackingWebhookRequestBody = () => {
        return Joi.object().keys({
            order: Joi.object().keys({
                id_order: Joi.string().guid().required(),
                status: Joi.string().required(),
                id_supplier: Joi.string().guid().required(),
                partner_name: Joi.string().required(),
                tracking_url: Joi.string().allow(null),
                tracking_number: Joi.string().allow(null),
                awb_filepath: Joi.string().allow(null),
            }).required()
        })
    }

    return {
        orderSupplierStatusUpdateRequestBody,
        updateSupplierTrackingInfoRequestBody,
        salasaTrackingWebhookRequestBody
    }
}
