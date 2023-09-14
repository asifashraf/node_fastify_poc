module.exports = function GeneralRequestSchema(opts) {
    const { Joi, baseRequestSchema } = opts;

    const routeInfo = {
        health: {
            url: '/health',
            method: 'GET'
        },
    };

    const schema = baseRequestSchema('generalRequestHandlers', routeInfo)

    return schema;
}
