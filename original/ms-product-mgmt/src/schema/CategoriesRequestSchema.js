module.exports = function CategoriesRequestSchema(opts) {
    const { baseRequestSchema, categoryRequestParameters, commonRequestHeaders } = opts;

    const routeInfo = {
        delete: {
            url: '/delete-category',
            method: 'POST',
            schema: {
                body: categoryRequestParameters.deleteCategoryRequestBody()
            }
        },
        save: {
            url: '/add-category',
            method: 'POST',
            schema: {
                body: categoryRequestParameters.createCategoriesRequestBody()
            }
        },
        fetch: {
            url: '/categories',
            method: 'POST',
            schema: {
                body: categoryRequestParameters.getAllCategoriesRequestBody(),
                headers: commonRequestHeaders.defaultHeaders()
            }
        },
        update: {
            url: '/update-category',
            method: 'POST',
            schema: {
                body: categoryRequestParameters.updateCategoriesRequestBody(),
            }
        },
        categoryFilters: {
            url: '/filters-by-category',
            method: 'POST',
            schema: {
                body: categoryRequestParameters.getCategoryFiltersRequestBody(),
                headers: commonRequestHeaders.defaultHeaders()
            }
        },
        getCategoryDetail: {
            url: '/category/:id',
            method: 'GET',
            schema : {
                params: categoryRequestParameters.deleteCategoryRequestBody()
            }
        },
        getCategoriesManufactures: {
            url: '/mega-menu/:id',
            method: 'GET',
            schema : {
                params: categoryRequestParameters.deleteCategoryRequestBody()
            }
        },


    };

    const schema = baseRequestSchema('categoriesRequestHandlers', routeInfo)

    return schema;
}
