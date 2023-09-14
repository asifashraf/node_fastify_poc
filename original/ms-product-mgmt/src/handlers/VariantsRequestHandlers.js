module.exports = function VariantsRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcVariants',
    ], 'variants');

    const {
        svcVariants
    } = handler.di;

    handler.fetch = async function (req, reply) {

        const { i8ln } = req

        const variants = await svcVariants.getAllVariants({ i8ln });

        reply.send( variants );
    }

    return handler;
}
