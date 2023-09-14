module.exports = function FeatureGroupsRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcFeatureGroups',
    ], 'feature_groups');

    const {
        svcFeatureGroups
    } = handler.di;

    handler.fetch = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters } = body;

        const feature_groups = await svcFeatureGroups.getAllFeatureGroups({ filters, pagination, i8ln });

        reply.send( feature_groups );
    }

    handler.save = async function (req, reply) {

        const { body } = req;

        const { featureGroup } = body;

        const feature_groups = await svcFeatureGroups.createFeatureGroups({ featureGroup });

        reply.send( feature_groups );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { featureGroup } = body;

        const feature_groups = await svcFeatureGroups.updateFeatureGroup({ featureGroup });

        reply.send( feature_groups );
    }

    handler.view = async function (req, reply) {

        const { params } = req;

        const { id } = params;

        const featureGroup = await svcFeatureGroups.viewFeatureGroup({ id });

        reply.send( featureGroup );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const feature_group = await svcFeatureGroups.deleteFeatureGroup({ id });

        reply.send( feature_group );
    }

    return handler;
}
