module.exports = function SvcProducts(opts) {

    const { Boom, logger, mdlProducts, mdlProductSort, i18n, mdlProductStock } = opts;

    const getAllProducts = async ({ filters, pagination, i8ln, fromDashboard }) => {
        try {

            const products = await mdlProducts.getAll( filters, pagination, i8ln, fromDashboard );

            return products;

        } catch (ex) {
            logger.error({ msg: 'SvcProductsjs > getAllProducts > error >', ex });
            throw Boom.notFound(`Error while fetching products: ${ex.message}`, ex);
        }
    }

    const createProduct = async ({ product }) => {
        try {

            const products = await mdlProducts.createProduct(product);
            return products;

        } catch (ex) {
            logger.error({ msg: 'SvcProductsjs > createProducts > error >', ex });
            throw Boom.notFound(`Error while creating products: ${ex.message}`, ex);
        }
    }

    const updateProduct = async ({ product }) => {
        try {

            const products = await mdlProducts.updateProduct(product);
            return products;

        } catch (ex) {
            logger.error({ msg: 'SvcProductsjs > updateProduct > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteProduct = async ({id}) => {
        try {

            const products = await mdlProducts.deleteProduct(id);
            return products;

        } catch (ex) {
            logger.error({ msg: 'SvcProductjs > deleteProduct > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const getProductDetail = async ({params, query, i8ln}) => {
        try {

            const products = await mdlProducts.productDetail(params, query, i8ln);
            return products;

        } catch (ex) {
            logger.error({ msg: 'SvcProductjs > ProductDetail > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const sortProducts = async () => {
        try {

            const sorted = await mdlProductSort.sortProducts();
            return sorted;

        } catch (ex) {
            logger.error({ msg: 'SvcProductjs > sortProducts > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateBulkProductsStock = async () => {
        try {

            const updated = await mdlProductStock.fetchDataAndProcessCSV();
            return updated;

        } catch (ex) {
            logger.error({ msg: 'SvcProductjs > updateBulkStockProducts > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }


    const notifyMe = async ({ product, i8ln }) => {
        try {

            const products = await mdlProducts.notifyMe( product, i8ln);

            return products;

        } catch (ex) {
            logger.error({ msg: 'SvcProductsjs > notifyWhenAvailable > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateProductsStock = async ({ products }) => {
        try {

            const product = await mdlProducts.updateProductsStock(products);
            return product;

        } catch (ex) {
            logger.error({ msg: 'SvcProductsjs > updateProductsStock > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const getSupplierProductDetails = async ({id_products, id_suppliers, i8ln}) => {
        try {

            const details = await mdlProducts.getSupplierProductDetails(id_products, id_suppliers, i8ln);
            return details;

        } catch (ex) {
            logger.error({ msg: 'SvcProductjs > getSupplierProductDetails > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllProducts,
        deleteProduct,
        createProduct,
        updateProduct,
        getProductDetail,
        notifyMe,
        updateProductsStock,
        getSupplierProductDetails,
        sortProducts,
        updateBulkProductsStock
    }

}
