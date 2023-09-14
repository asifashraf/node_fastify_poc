module.exports = function VariantsRequestSchema(opts) {
    const { baseRequestSchema } = opts;

    const routeInfo = {
        fetch: {
            url: '/variants',
            method: 'POST',
        }
    };

    const schema = baseRequestSchema('variantsRequestHandlers', routeInfo)

    return schema;
}
