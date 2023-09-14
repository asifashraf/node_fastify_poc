module.exports = function FeaturesRequestSchema(opts) {
    const { baseRequestSchema, featuresRequestParameters } = opts;

    const routeInfo = {
        delete: {
            url: '/delete-features',
            method: 'POST',
            schema: {
                body: featuresRequestParameters.deleteFeatureRequestBody()
            }
        },
        save: {
            url: '/add-feature',
            method: 'POST',
            schema: {
                body: featuresRequestParameters.createFeatureRequestBody()
            }
        },
        update: {
            url: '/update-feature',
            method: 'POST',
            schema: {
                body: featuresRequestParameters.updateFeatureRequestBody()
            }
        },
        fetch: {
            url: '/features',
            method: 'POST',
            schema: {
                body: featuresRequestParameters.getAllFeaturesRequestBody()
            }
        },
        view: {
            url: '/feature/:id',
            method: 'GET',
            schema: {
                params: featuresRequestParameters.getFeatureDetailsRequestBody()
            }
        }
    };

    const schema = baseRequestSchema('featuresRequestHandlers', routeInfo)

    return schema;
}
