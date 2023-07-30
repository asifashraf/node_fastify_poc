module.exports = function CrudBaseHandler(opts) {

    return (dependencies, handler) => {

        const _handler = handler;

        const di = {};

        dependencies.forEach(d => di[d] = opts[d]);

        return ({
            get name() { return _handler; },
            get di() { return di },
            save: async function (request, reply) {
                reply.send({ crudeBaseSave: true });
            },
            fetch: async function (request, reply) {
                reply.send({ crudBaseFetch: true })
            },
            delete: async function (request, reply) {
                reply.send({ crudBaseDelete: true })
            }
        })
    }

}
