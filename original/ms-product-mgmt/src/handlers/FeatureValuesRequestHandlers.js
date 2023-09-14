module.exports = function FeatureValuesRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcFeatureValues',
    ], 'feature_values');

    const {
        svcFeatureValues
    } = handler.di;

    handler.fetch = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters } = body;

        const feature_values = await svcFeatureValues.getAllFeatureValues({ filters, pagination, i8ln });

        reply.send( feature_values );
    }

    handler.save = async function (req, reply) {

        const { body } = req;

        const { featureValue } = body;

        const feature_values = await svcFeatureValues.createFeatureValue({ featureValue });

        reply.send( feature_values );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { featureValue } = body;

        const feature_values = await svcFeatureValues.updateFeatureValue({ featureValue });

        reply.send( feature_values );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const feature_value = await svcFeatureValues.deleteFeatureValue({ id });

        reply.send( feature_value );
    }

    handler.view = async function (req, reply) {

        const { params } = req;

        const { id } = params;

        const featureValue = await svcFeatureValues.viewFeatureValue({ id });

        reply.send( featureValue );
    }

    return handler;
}
