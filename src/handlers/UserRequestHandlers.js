module.exports = function UserRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcUser',
    ], 'users');

    const {
        svcFeatures
    } = handler.di;

    handler.save = async function (req, reply) {

        reply.send( { ok: 1 }  );
    }
    console.log('user post', opts);

    return handler;
}
