module.exports = function ProductsWishlistRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcProductsWishlist',
    ], 'products_wishlist');

    const {
        svcProductsWishlist
    } = handler.di;

    handler.getWishlistProducts = async function (req, reply) {

        const { pagination, i8ln } = req;

        const products = await svcProductsWishlist.getWishlistProducts({ pagination, i8ln });

        reply.send( products );
    }

    handler.addToWishlist = async function (req, reply) {

        const { body, i8ln } = req;

        const { id } = body;

        const wishedProduct = await svcProductsWishlist.addToWishlist({ id, i8ln });

        reply.send( wishedProduct );
    }

    handler.removeFromWishlist = async function (req, reply) {

        const { body, i8ln } = req;

        const { id } = body;

        const wishedProduct = await svcProductsWishlist.removeFromWishlist({ id, i8ln });

        reply.send( wishedProduct );
    }

    return handler;
}
