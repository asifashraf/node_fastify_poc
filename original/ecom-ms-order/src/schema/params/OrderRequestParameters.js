module.exports = (opts) => {
    const {
        Joi,
    } = opts;

    const placeOrderRequestBody = () => {
        return Joi.object().keys({
            order: Joi.object().keys({
                id_cart: Joi.string().guid().required().trim(),
                payment_method: Joi.string().required(),
                use_credit: Joi.boolean().required(),
                device_type: Joi.string().required(),
                notes: Joi.string().optional(),
                sourceId: Joi.string().optional(),
                cvv: Joi.string().optional(),
                tabby_payment_id: Joi.string().optional()
            }).required()
        })
    }

    const orderUpdateRequestBody = () => {
        return Joi.object().keys({
            order: Joi.object().keys({
                id: Joi.string().guid().required(),
                products: Joi.array().items({
                    id: Joi.string().guid().required(),
                    id_attribute: Joi.string().guid().required(),
                    quantity: Joi.number().required().min(0).message("Quantity must be greater than 0"),
                    status: Joi.string().guid(),
                    deleted: Joi.boolean().optional(),
                }).min(1),
                notes: Joi.string(),
                trackingNumber: Joi.string(),
                deliveryPartner: Joi.string().guid(),
                trackingUrl: Joi.string(),
                awbFilePath: Joi.string(),
                deliveryAddress: Joi.string(),
                city: Joi.string(),
                mapLink: Joi.string(),
                coupon: Joi.array().items({
                    id_cart_rule: Joi.string().guid().required(),
                    action: Joi.string().valid('apply','remove').required(),
                }),
            })
            .or('products', 'notes', 'trackingNumber', 'coupon', 'deliveryAddress', 'mapLink', 'city')
            .required()
        })
    }

    const getOrderDetailRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required(),
        })
    }

    const getCustomerOrdersCount = () => {
         return Joi.object().keys({
            filters: Joi.object().keys({
                id_customer: Joi.string().guid().required(),
            }).required()
        })
    }

    const orderDetailsRequestBody = () => {
        return Joi.object().keys({
            id: Joi.string().guid().required(),
        })
    }

    const orderDetailsRequestParams = () => {
        return Joi.object().keys({
            id_supplier: Joi.string().guid(),
        })
    }

    const orderStatusUpdateRequestBody = () => {
        return Joi.object().keys({
            order: Joi.object().keys({
                id: Joi.string().guid().required(),
                id_status: Joi.string().guid().required(),
            }).required()
        })
    }

    const orderProductStatusUpdateRequestBody = () => {
        return Joi.object().keys({
            order: Joi.object().keys({
                id_order: Joi.string().guid().required(),
                id_status: Joi.string().guid().required(),
                id_product: Joi.string().guid().required(),
                id_product_attribute: Joi.string().guid().required(),
            }).required()
        })
    }

    const orderListRequestBody = () => {
        return Joi.object().keys({
            filters: Joi.object().keys({
                keyword: Joi.string(),
                sort_by: Joi.object().keys(),
                startDate: Joi.date().iso(),
                endDate: Joi.date().iso(),
                id_supplier: Joi.string().guid(),
                countryIso: Joi.string().trim(),
                customerName: Joi.string(),
                supplier: Joi.string().guid(),
                orderStatus: Joi.string().guid(),
                cofeCustomerId: Joi.string(),
            }),
        })
    }

    const couponUsageBody = () => {
        return Joi.object().keys({
            id_customer: Joi.string().guid(),
            id_cart_rule: Joi.string().guid().required(),
        })
   }

   const tabbyCallbackRequestBody = () => {
        return Joi.object().keys({
            tabbyPaymentId: Joi.string().required(),
            orderId: Joi.string().guid().required(),
        })
    }
   
    return {
        placeOrderRequestBody,
        getOrderDetailRequestBody,
        orderDetailsRequestBody,
        orderDetailsRequestParams,
        orderListRequestBody,
        orderStatusUpdateRequestBody,
        orderProductStatusUpdateRequestBody,
        orderUpdateRequestBody,
        getCustomerOrdersCount,
        couponUsageBody,
        tabbyCallbackRequestBody
    }
}
