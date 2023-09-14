module.exports = (opts) => {
    const {
        Joi
    } = opts;

    const getAllOffersRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                keyword: Joi.string().allow('', null).trim(),
                offer_type: Joi.string().allow('', null).trim(),
                status: Joi.string().valid('active', 'inactive', 'expired'),
                date_from: Joi.date().iso(),
                date_to: Joi.date().iso(),
            }).optional()
        })
    }

    const createOfferRequestBody = () => {
        return Joi.object().keys({
            offer: Joi.object().keys({
                name: Joi.string().max(191).required().trim(),
                date_from: Joi.date().required(),
                date_to: Joi.date().greater(Joi.ref('date_from')).message("From date must be less than to date"),
                active: Joi.boolean().default(true),
                offer_type: Joi.string().required().max(191).trim(),
                country_iso: Joi.string().required(),
                id_country: Joi.string().guid().required(),
                offer_tag: Joi.string().required().max(191).trim(),
                offer_tag_ar: Joi.string().required().max(191).trim(),
                offer_desc: Joi.string().required().max(500).trim(),
                offer_desc_ar: Joi.string().required().max(500).trim(),
                offer_icon: Joi.string().required().max(500).trim(),
                offer_desc_icon: Joi.string().allow(null),
                products: Joi.boolean(),
                file_name: Joi.string(),
                categories: Joi.boolean(),
                id_categories: Joi.array().items(Joi.string().guid().required()),
                suppliers: Joi.boolean(),
                id_suppliers: Joi.array().items(Joi.string().guid().required()),
                manufacturers: Joi.boolean(),
                id_manufacturers: Joi.array().items(Joi.string().guid().required()),
                exclude_with_existing_offers: Joi.boolean(),
                exclude_with_existing_discounts: Joi.boolean(),
                user : {
                    id: Joi.string().guid().required(),
                    first_name: Joi.string().required(),
                    last_name: Joi.string().required(),
                    email: Joi.string().email().required()
                }
            }).required()
        })
    }

    const updateOfferRequestBody = () => {
        return Joi.object().keys({
            offer: Joi.object().keys({
                id: Joi.string().guid().required(),
                name: Joi.string().max(191).trim(),
                date_from: Joi.date(),
                date_to: Joi.date().greater(Joi.ref('date_from')).message("From date must be less than to date"),
                active: Joi.boolean(),
                offer_type: Joi.string().max(191).trim(),
                country_iso: Joi.string(),
                id_country: Joi.string().guid(),
                offer_tag: Joi.string().max(191).trim(),
                offer_tag_ar: Joi.string().max(191).trim(),
                offer_desc: Joi.string().max(500).trim(),
                offer_desc_ar: Joi.string().max(500).trim(),
                offer_icon: Joi.string().max(500).trim(),
                offer_desc_icon: Joi.string().allow(null),
                products: Joi.boolean(),
                file_name: Joi.string(),
                categories: Joi.boolean(),
                id_categories: Joi.array().items(Joi.string().guid().required()),
                suppliers: Joi.boolean(),
                id_suppliers: Joi.array().items(Joi.string().guid().required()),
                manufacturers: Joi.boolean(),
                id_manufacturers: Joi.array().items(Joi.string().guid().required()),
                exclude_with_existing_offers: Joi.boolean(),
                exclude_with_existing_discounts: Joi.boolean(),
                user: {
                    id: Joi.string().guid().required(),
                    first_name: Joi.string().required(),
                    last_name: Joi.string().required(),
                    email: Joi.string().email().required()
                }
            })
            // At least one of these keys must be in the object to be valid.
            .or('name', 'date_from', 'date_to','active','offer_type','country_iso','offer_tag','offer_tag_ar','offer_desc_ar','offer_desc','offer_icon',
                        'offer_desc_icon', 'products','fileName','categories','id_categories','suppliers','id_suppliers','manufacturers','id_manufacturers',
                        'exclude_with_existing_offers','exclude_with_existing_discounts')
            .required()
        })
    }

    const viewOfferRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required(),
        })
    }

    const deleteOfferRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required()
        })
    }

    return {
        getAllOffersRequestBody,
        createOfferRequestBody,
        deleteOfferRequestBody,
        updateOfferRequestBody,
        viewOfferRequestBody
    }

}
