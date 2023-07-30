module.exports = function UserRequestSchema(opts) {
    const { baseRequestSchema, userRequestParameters } = opts;

    const routeInfo = {
        save: {
            url: '/user',
            method: 'POST',
            schema: {
                body: userRequestParameters.createUserRequestBody()
            }
        },
    };

    return baseRequestSchema('userRequestHandlers', routeInfo);
}
