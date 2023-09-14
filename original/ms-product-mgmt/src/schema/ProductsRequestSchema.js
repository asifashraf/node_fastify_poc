module.exports = function ProductsRequestSchema(opts) {
    const { baseRequestSchema, productRequestParameters, commonRequestHeaders } = opts;

    const routeInfo = {
        
        delete: {
            url: '/delete-product',
            method: 'POST',
            schema: {
                body: productRequestParameters.deleteProductRequestBody()
            }
        },
        
        save: {
            url: '/add-product',
            method: 'POST',
            schema: {
                body: productRequestParameters.createProductRequestBody()
            }
        },
        
        update: {
            url: '/update-product',
            method: 'POST',
            schema: {
                body: productRequestParameters.updateProductRequestBody()
            }
        },
        
        updateStock: {
            url: '/update-product-stock',
            method: 'POST',
            schema: {
                body: productRequestParameters.updateProductsStockRequestBody()
            }
        },
        
        getAllProducts: {
            url: '/products',
            method: 'POST',
            schema : {
                body: productRequestParameters.getAllProductsRequestBody(),
                headers: commonRequestHeaders.defaultHeaders()
            }
        },
        
        getProductDetail: {
            url: '/product/:id',
            method: 'GET',
            schema : {
                params: productRequestParameters.getProductDetailRequestBody(),
                querystring: productRequestParameters.getProductDetailRequestQuery(),
                headers: commonRequestHeaders.defaultHeaders()
            }
        },

        notifyMe: {
            url: '/notify-me',
            method: 'POST',
            schema: {
                body: productRequestParameters.notifyMeAvailableRequestBody(),
                headers: commonRequestHeaders.authHeader()
            }
        },

        sortProducts: {
            url: '/sort-products',
            method: 'GET',
            schema : {
                headers: commonRequestHeaders.defaultHeaders()
            }
        },

        getSupplierProductDetails: {
            url: '/get-supplier-and-product-details',
            method: 'POST',
            schema: {
                body: productRequestParameters.getSupplierProductDetailRequestBody()
            }
        },

        updateBulkProductsStock: {
            url: '/bulk-stock-update',
            method: 'GET',
            schema : {
                headers: commonRequestHeaders.defaultHeaders()
            }
        },


    }

    const schema = baseRequestSchema('productsRequestHandlers', routeInfo)

    return schema;
}
