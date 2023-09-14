module.exports = function OrderRequestSchema(opts) {
    const { baseRequestSchema, orderRequestParameters, commonRequestHeaders } = opts;

    const routeInfo = {
        placeOrder: {
            url: '/place-order',
            method: 'POST',
            schema: {
                body: orderRequestParameters.placeOrderRequestBody(),
                headers: commonRequestHeaders.authHeader()
            }
        },

        orderDetail: {
            url: '/order-detail/:id',
            method: 'GET',
            schema: {
                params: orderRequestParameters.getOrderDetailRequestBody(),
                headers: commonRequestHeaders.authHeader()
            }
        },

        orderShipments: {
            url: '/order-shipments/:id',
            method: 'GET',
            schema: {
                params: orderRequestParameters.getOrderDetailRequestBody(),
                headers: commonRequestHeaders.authHeader()
            }
        },

        customerOrders: {
            url: '/custumer-orders',
            method: 'GET',
            schema: {
                headers: commonRequestHeaders.authHeader()
            }
        },

        customerOrdersForTabby: {
            url: '/custumer-recent-orders',
            method: 'GET',
            schema: {
                headers: commonRequestHeaders.authHeader()
            }
        },

        viewOrderDetails: {
            url: '/admin-order-detail/:id',
            method: 'GET',
            schema: {
                params: orderRequestParameters.orderDetailsRequestBody(),
                querystring: orderRequestParameters.orderDetailsRequestParams(),
                headers: commonRequestHeaders.defaultHeaders(),
            }
        },

        getAllOrders: {
            url: '/orders',
            method: 'POST',
            schema: {
                body: orderRequestParameters.orderListRequestBody(),
                headers: commonRequestHeaders.defaultHeaders(),
            }
        },

        getAllProductStatus: {
            url: '/product-statuses',
            method: 'POST',
        },

        getAllOrderStatus: {
            url: '/order-statuses',
            method: 'POST',
        },

        orderStatusUpdate: {
            url: '/order-status',
            method: 'POST',
            schema: {
                body: orderRequestParameters.orderStatusUpdateRequestBody(),
            }
        },

        orderProductStatusUpdate: {
            url: '/order-product-status',
            method: 'POST',
            schema: {
                body: orderRequestParameters.orderProductStatusUpdateRequestBody(),
            }
        },

        paymentWebHook: {
            url: '/payment-webhook',
            method: 'POST'
        },

        paymentCallBack: {
            url: '/payment-callback',
            method: 'POST'
        },

        tabbyPaymentCallback: {
            url: '/tabby-callback',
            method: 'POST',
            schema: {
                body: orderRequestParameters.tabbyCallbackRequestBody(),
            }
        },

        paymentMfCallBack: {
            url: '/payment-mf-callback',
            method: 'POST'
        },

        paymentTapCallBack: {
            url: '/payment-tap-callback',
            method: 'POST'
        },

        updateOrder: {
            url: '/update-order',
            method: 'POST',
            schema: {
                body: orderRequestParameters.orderUpdateRequestBody(),
            }
        },

        customerOrdersCount: {
            url: '/customer-orders-count',
            method: 'POST',
            schema: {
                body: orderRequestParameters.getCustomerOrdersCount(),
            }
        },

        couponUsage: {
            url: '/coupon-usage',
            method: 'POST',
            schema: {
                body: orderRequestParameters.couponUsageBody(),
            }
        },

    };

    const schema = baseRequestSchema('ordersRequestHandlers', routeInfo)

    return schema;
}
