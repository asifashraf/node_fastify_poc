module.exports = function ProductFeedbackSchema(opts) {

    const { baseRequestSchema, productFeedbackRequestParameters } = opts;

    const routeInfo = {
        save: {
            url: '/product-feedback-score',
            method: 'POST',
            schema: {
                body: productFeedbackRequestParameters.productFeedbackRequestBody()
            }
        },
        fetch: {
            url: '/product-feedback-score',
            method: 'GET'
        },
        delete: {
            url: '/product-feedback-score',
            method: 'DELETE'
        },
        patch: {
            url: '/product-feedback-score',
            method: 'PATCH'
        }
    };

    const schema = baseRequestSchema('productFeedbackRequestHandlers', routeInfo)

    return schema;
}
