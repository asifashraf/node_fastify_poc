module.exports = (opts) => {
    const {
        Joi,
    } = opts;

   const phoneNumberRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[\s\./0-9]*$/

    const createSupplierRequestBody = () => {
        return Joi.object().keys({
            supplier: Joi.object().keys({
                name: Joi.string().required().trim(),
                active: Joi.boolean().optional(),
                vat_number: Joi.string().max(100).required().trim(),
                phone: Joi.string().max(50).required().trim().pattern(phoneNumberRegex),
                email: Joi.string().max(50).required().email(),
                is_verified: Joi.boolean().optional().default(false),
                commission: Joi.number().optional(),
                service_email: Joi.string().max(50).optional().trim().email(),
                service_phone: Joi.string().max(50).optional().trim().pattern(phoneNumberRegex),
                description: Joi.string().optional().trim(),
                image: Joi.string(),
                business_model: Joi.string().required().trim()
            })
        })
    }

    const updateSupplierRequestBody = () => {
        return Joi.object().keys({
            supplier: Joi.object().keys({
                id: Joi.string().guid().required(),
                name: Joi.string().optional().trim(),
                active: Joi.boolean().optional(),
                vat_number: Joi.string().max(100).optional().trim(),
                phone: Joi.string().max(50).optional().trim().pattern(phoneNumberRegex),
                email: Joi.string().max(50).optional().email(),
                is_verified: Joi.boolean().optional(),
                commission: Joi.number().allow(null).optional(),
                service_email: Joi.string().allow(null).max(50).optional().trim().email(),
                service_phone: Joi.string().allow(null).max(50).optional().trim().pattern(phoneNumberRegex),
                description: Joi.string().allow(null).optional().trim(),
                image: Joi.string(),
                business_model: Joi.string().optional().trim()
            })
            // At least one of these keys must be in the object to be valid.
            .or('name', 'active', 'vat_number','phone','email', 'business_model', 'is_verified','commission','service_email','service_phone','description','image')
            .required()
        })
    }

    const createSupplierCategoryCommissionRequestBody = () => {
        return Joi.object().keys({
            commission: Joi.object().keys({
                id_category: Joi.string().guid().required(),
                id_supplier: Joi.string().guid().required(),
                commission_percentage: Joi.string().required().trim(),
            })
        })
    }

    const getAllSuppliersRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                active: Joi.boolean().optional(),
                business_model: Joi.boolean().optional(),
                keyword: Joi.string().allow('').trim(),
                id: Joi.string().uuid().optional()
            })
        })
    }

    const getBulkSuppliersListRequestBody = () => {
        return Joi.object().keys({
            id_suppliers: Joi.array().items(Joi.string().guid()),
        })
    }

    const deleteSuppliersRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    const getSpecificSupplier = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        createSupplierRequestBody,
        updateSupplierRequestBody,
        createSupplierCategoryCommissionRequestBody,
        getAllSuppliersRequestBody,
        deleteSuppliersRequestBody,
        getSpecificSupplier,
        getBulkSuppliersListRequestBody,
    }

}
