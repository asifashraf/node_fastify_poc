module.exports = function ManufacturersRequestSchema(opts) {
    const { baseRequestSchema, manufacturerRequestParameters, commonRequestHeaders } = opts;

    const routeInfo = {
        delete: {
            url: '/delete-manufacturer',
            method: 'POST',
            schema: {
                body: manufacturerRequestParameters.deleteManufacturerRequestBody()
            }
        },
        save: {
            url: '/add-manufacturer',
            method: 'POST',
            schema: {
                body: manufacturerRequestParameters.createManufacturerRequestBody()
            }
        },
        fetch: {
            url: '/manufacturers',
            method: 'POST',
            schema: {
                body: manufacturerRequestParameters.getAllManufacturersRequestBody(),
                headers: commonRequestHeaders.defaultHeaders()
            }
        },
        update: {
            url: '/update-manufacturer',
            method: 'POST',
            schema: {
                body: manufacturerRequestParameters.updateManufacturerRequestBody()
            }
        },
        getManufacturerDetail: {
            url: '/manufacturer/:id',
            method: 'GET',
            schema : {
                params: manufacturerRequestParameters.deleteManufacturerRequestBody()
            }
        },
    };

    const schema = baseRequestSchema('manufacturersRequestHandlers', routeInfo)

    return schema;
}
