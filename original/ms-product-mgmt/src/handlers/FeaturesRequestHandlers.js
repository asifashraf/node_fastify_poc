module.exports = function FeaturesRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcFeatures',
    ], 'features');

    const {
        svcFeatures
    } = handler.di;

    handler.fetch = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters } = body;

        const features = await svcFeatures.getAllFeatures({ filters, pagination, i8ln });

        reply.send( features );
    }

    handler.save = async function (req, reply) {

        const { body } = req;

        const { feature } = body;

        const features = await svcFeatures.createFeature({ feature });

        reply.send( features );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { feature } = body;

        const features = await svcFeatures.updateFeature({ feature });

        reply.send( features );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const features = await svcFeatures.deletefeature({ id });

        reply.send( features );
    }

    handler.view = async function (req, reply) {

        const { params } = req;

        const { id } = params

        const features = await svcFeatures.view({ id });

        reply.send( features );
    }

    return handler;
}
