module.exports = function FeatureGroupsRequestSchema(opts) {
    const { baseRequestSchema, featureGroupsRequestParameters } = opts;

    const routeInfo = {
        delete: {
            url: '/delete-feature-group',
            method: 'POST',
            body: featureGroupsRequestParameters.deleteFeatureGroupRequestBody()
        },
        save: {
            url: '/add-feature-group',
            method: 'POST',
            schema: {
                body: featureGroupsRequestParameters.createFeatureGroupRequestBody()
            }
        },
        update: {
            url: '/update-feature-group',
            method: 'POST',
            schema: {
                body: featureGroupsRequestParameters.updateFeatureGroupRequestBody(),
            }
        },
        fetch: {
            url: '/feature-groups',
            method: 'POST',
            schema: {
                body: featureGroupsRequestParameters.getAllFeatureGroupsRequestBody()
            }
        },

        view: {
            url: '/feature-group/:id',
            method: 'GET',
            schema: {
                params: featureGroupsRequestParameters.getFeatureGroupsRequestBody()
            }
        }
    };

    const schema = baseRequestSchema('featureGroupsRequestHandlers', routeInfo)

    return schema;
}
