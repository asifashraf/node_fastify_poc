module.exports = function SupplierStatusRequestSchema(opts) {

    const { baseRequestSchema, supplierRequestParameters } = opts;

    const routeInfo = {
        getAllSupplierStatus: {
            url: '/supplier-statuses',
            method: 'POST',
        },

        orderSupplierStatusUpdate: {
            url: '/order-supplier-status',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.orderSupplierStatusUpdateRequestBody(),
            }
        },

        updateSupplierTrackingInfo: {
            url: '/update-supplier-tracking',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.updateSupplierTrackingInfoRequestBody(),
            }
        },

        salasaTrackingWebhook: {
            url: '/update-tracking-webhook',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.salasaTrackingWebhookRequestBody(),
            }
        }
    };

    const schema = baseRequestSchema('suppliersRequestHandlers', routeInfo)

    return schema;
}
