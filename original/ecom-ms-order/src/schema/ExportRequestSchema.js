module.exports = function OrderRequestSchema(opts) {
    const { baseRequestSchema, exportRequestParameters, commonRequestHeaders } = opts;

    const routeInfo = {
        exportAllOrders: {
            url: '/export-orders',
            method: 'POST',
            schema: {
                body: exportRequestParameters.exportOrderListRequestBody(),
                headers: commonRequestHeaders.defaultHeaders(),
            }
        },
    };

    const schema = baseRequestSchema('exportRequestHandlers', routeInfo)

    return schema;
}
