module.exports = function SvcProductsWishlist(opts) {

    const { Boom, logger, mdlWishlistProducts, i18n } = opts;

    const getWishlistProducts = async ({ pagination, i8ln }) => {
        try {

            const products = await mdlWishlistProducts.getWishlistProducts( pagination, i8ln );

            return products;

        } catch (ex) {
            logger.error({ msg: 'SvcProductsjs > getWishlistProducts > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const addToWishlist = async ({ id, i8ln }) => {
        try {

            const wishedProduct = await mdlWishlistProducts.addToWishlist(id, i8ln);
            return wishedProduct;

        } catch (ex) {
            logger.error({ msg: 'SvcProductsjs > add to wishlist Products > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

     const removeFromWishlist = async ({ id, i8ln }) => {
         try {

             const wishedProduct = await mdlWishlistProducts.removeFromWishlist(id, i8ln);
             return wishedProduct;

         } catch (ex) {
             logger.error({ msg: 'SvcProductsjs > remove from wishlist > error >', ex });
             throw new Boom.Boom(i18n.__(ex.message));
         }
     }

    return {
        getWishlistProducts,
        addToWishlist,
        removeFromWishlist
    }

}
