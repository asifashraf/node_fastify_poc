module.exports = (opts) => {
    const {
        Joi,
    } = opts;

    const phoneNumberRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[\s\./0-9]*$/

    const createSupplierLocationsRequestBody = () => {
        return Joi.object().keys({
            location: Joi.object().keys({
                id_supplier: Joi.string().guid().required(),
                first_name: Joi.string().max(50).required().trim(),
                last_name: Joi.string().max(50).required().trim(),
                alias: Joi.string().max(50).optional().trim(),
                company: Joi.string().max(100).optional().trim(),
                address: Joi.string().required().trim(),
                id_country: Joi.string().guid().required(),
                id_city: Joi.string().guid().required(),
                phone: Joi.string().max(50).required().trim().pattern(phoneNumberRegex),
                mobile: Joi.string().max(50).optional().trim().pattern(phoneNumberRegex),
                postcode: Joi.string().max(50).optional().trim(),
                active: Joi.boolean().optional(),
            })
        })
    }

    const updateSupplierLocationsRequestBody = () => {
        return Joi.object().keys({
            location: Joi.object().keys({
                id: Joi.string().guid().required(),
                first_name: Joi.string().max(50).trim(),
                last_name: Joi.string().max(50).trim(),
                alias: Joi.string().allow(null).max(50).trim(),
                company: Joi.string().allow(null).max(100).optional().trim(),
                address: Joi.string().trim(),
                id_country: Joi.string().guid(),
                id_city: Joi.string().guid(),
                phone: Joi.string().max(50).trim().pattern(phoneNumberRegex),
                mobile: Joi.string().allow(null).max(50).trim().pattern(phoneNumberRegex),
                postcode: Joi.string().allow(null).max(50).trim(),
                active: Joi.boolean()
            })
            // At least one of these keys must be in the object to be valid.
            .or('first_name', 'last_name', 'alias','company','address','id_country','id_city','phone','mobile','postcode','active') 
            .required()
        })
    }

    const getAllSupplierLocationsRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                active: Joi.boolean()
            }),
            id_supplier: Joi.string().guid().required()
        })
    }

    const deleteSupplierLocationRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    const getMultipleSuppliersLocationsRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                id_suppliers: Joi.array().items(Joi.string().guid().required()).required(),
                id_country: Joi.string().guid().required()
            }),
        })
    }

    return {
        createSupplierLocationsRequestBody,
        updateSupplierLocationsRequestBody,
        getAllSupplierLocationsRequestBody,
        deleteSupplierLocationRequestBody,
        getMultipleSuppliersLocationsRequestBody
    }
}
