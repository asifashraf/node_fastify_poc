module.exports = function FeatureValuesRequestSchema(opts) {
    const { baseRequestSchema, featureValuesRequestParameters } = opts;

    const routeInfo = {
        delete: {
            url: '/delete-feature-values',
            method: 'POST',
            schema: {
                body: featureValuesRequestParameters.deleteFeatureValueRequestBody()
            }
        },
        save: {
            url: '/add-feature-value',
            method: 'POST',
            schema: {
                body: featureValuesRequestParameters.createFeatureValueRequestBody()
            }
        },
        update: {
            url: '/update-feature-value',
            method: 'POST',
            schema: {
                body: featureValuesRequestParameters.updateFeatureValueRequestBody()
            }
        },
        fetch: {
            url: '/feature-values',
            method: 'POST',
            schema: {
                body: featureValuesRequestParameters.getAllFeatureValuesRequestBody()
            }
        },
        view: {
            url: '/feature-value/:id',
            method: 'GET',
            schema: {
                params: featureValuesRequestParameters.getFeatureValueRequestBody()
            }
        }
    };

    const schema = baseRequestSchema('featureValuesRequestHandlers', routeInfo)

    return schema;
}
