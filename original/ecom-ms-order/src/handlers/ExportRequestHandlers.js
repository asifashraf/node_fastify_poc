module.exports = function ExportsRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcExports',
    ]);

    const {
        svcExports
    } = handler.di;

    handler.exportAllOrders = async function (req, reply) {

        const { body, pagination, i8ln, headers } = req;

        const { filters, timezone } = body

        const order = await svcExports.exportAllOrders({ filters, pagination, i8ln, user: { email: headers.email, name: headers.name }, timezone });

        reply.send( order );
    }

    return handler;
}
