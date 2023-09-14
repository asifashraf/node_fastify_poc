module.exports = (opts) => {
    const {
        Joi,
    } = opts;


    const createSupplierBankDetailsRequestBody = () => {
        return Joi.object().keys({
            bank_details: Joi.object().keys({
                id_supplier: Joi.string().guid().required(),
                account_title: Joi.string().max(100).required().trim(),
                account_number: Joi.string().max(50).required().trim(),
                bank: Joi.string().max(100).required().trim(),
                iban_number: Joi.string().max(100).required().trim(),
                swift_code: Joi.string().max(50).optional().trim(),
                address: Joi.string().optional().trim(),
                active: Joi.boolean()
            })
        })
    }

    const updateSupplierBankDetailsRequestBody = () => {
        return Joi.object().keys({
            bank_details: Joi.object().keys({
                id: Joi.string().guid().required(),
                account_title: Joi.string().max(100).optional().trim(),
                account_number: Joi.string().max(50).optional().trim(),
                bank: Joi.string().max(100).optional().trim(),
                iban_number: Joi.string().max(100).optional().trim(),
                swift_code: Joi.string().allow(null).max(50).optional().trim(),
                address: Joi.string().allow(null).optional().trim(),
                active: Joi.boolean()
            })
            // At least one of these keys must be in the object to be valid.
            .or('account_title', 'account_number', 'iban_number','swift_code','address','active','bank') 
            .required()
        })
    }

    const getAllSupplierBankDetailsRequestBody = () => {
        return Joi.object().keys({
            id_supplier: Joi.string().guid().required()
        })
    }

    const deleteSupplierBankDetailsRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        createSupplierBankDetailsRequestBody,
        updateSupplierBankDetailsRequestBody,
        getAllSupplierBankDetailsRequestBody,
        deleteSupplierBankDetailsRequestBody
    }
}
