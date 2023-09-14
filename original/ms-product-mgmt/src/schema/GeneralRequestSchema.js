module.exports = function GeneralRequestSchema(opts) {
    const {
        baseRequestSchema,
        commonDefinitions,
    } = opts;

    const routeInfo = {
        health: {
            url: '/health',
            method: 'GET',
            schema: {
                response: commonDefinitions.createResponseSchema({
                    status: { type: 'boolean' }
                },'Health Api Description')
            }
        }

    };

    const schema = baseRequestSchema('generalRequestHandlers', routeInfo)

    return schema;
}
