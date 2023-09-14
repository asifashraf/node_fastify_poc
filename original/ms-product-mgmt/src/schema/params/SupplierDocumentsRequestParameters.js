module.exports = (opts) => {
    const {
        Joi,
    } = opts;

    const createSupplierDocumentsRequestBody = () => {
        return Joi.object().keys({
            document: Joi.object().keys({
                id_supplier: Joi.string().guid().required(),
                vat_certificate: Joi.string().max(100).trim(),
                company_registration_certificate: Joi.string().max(100).trim()
            })
            .or('vat_certificate','company_registration_certificate') 
            .required()
        })
    }

    const updateSupplierDocumentsRequestBody = () => {
        return Joi.object().keys({
            document: Joi.object().keys({
                id: Joi.string().guid().required(),
                vat_certificate: Joi.string().max(100).trim(),
                company_registration_certificate: Joi.string().max(100).trim()
            })
            .or('vat_certificate','company_registration_certificate') 
            .required()
        })
    }

    const getSupplierDocumentsRequestBody = () => {
        return Joi.object().keys({
            id_supplier: Joi.string().guid().required()
        })
    }

    const deleteSupplierDocumentsRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required(),
            documentType: Joi.string().valid('vat','registration').required(),
        })
    }

    return {
        createSupplierDocumentsRequestBody,
        updateSupplierDocumentsRequestBody,
        getSupplierDocumentsRequestBody,
        deleteSupplierDocumentsRequestBody
    }
}
