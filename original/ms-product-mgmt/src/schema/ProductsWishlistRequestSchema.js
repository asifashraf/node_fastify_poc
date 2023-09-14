module.exports = function ProductsWishlistRequestSchema(opts) {

    const { baseRequestSchema, productRequestParameters, commonRequestHeaders } = opts;

    const routeInfo = {

        getWishlistProducts: {
            url: '/wishlist-products',
            method: 'GET',
            schema : {
                headers: commonRequestHeaders.authHeader()
            }
        },

        addToWishlist: {
            url: '/add-to-wishlist',
            method: 'POST',
            schema: {
                body: productRequestParameters.getProductDetailRequestBody(),
                headers: commonRequestHeaders.authHeader()
            }
        },

        removeFromWishlist: {
            url: '/remove-from-wishlist',
            method: 'POST',
            schema: {
                body: productRequestParameters.getProductDetailRequestBody(),
                headers: commonRequestHeaders.authHeader()
            }
        },

    };

    const schema = baseRequestSchema('productsWishlistRequestHandlers', routeInfo)

    return schema;
}
