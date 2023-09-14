module.exports = function ProductsRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcProducts',
    ], 'products');

    const {
        svcProducts
    } = handler.di;

    handler.getAllProducts = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters, fromDashboard } = body;

        const products = await svcProducts.getAllProducts({ filters, pagination, i8ln, fromDashboard });

        reply.send( products );
    }

    handler.save = async function (req, reply) {

        const { body } = req;

        const { product } = body;

        const products = await svcProducts.createProduct({ product });

        reply.send( products );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { product } = body;

        const products = await svcProducts.updateProduct({ product });

        reply.send( products );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const products = await svcProducts.deleteProduct({ id });

        reply.send( products );
    }

    handler.getProductDetail = async function (req, reply) {

        const { params, query, i8ln } = req;

        const products = await svcProducts.getProductDetail({ params, query, i8ln });

        reply.send( products );
    }

    handler.notifyMe = async function (req, reply) {

        const { body, i8ln } = req;

        const { product } = body;

        const products = await svcProducts.notifyMe({ product, i8ln });

        reply.send( products );
    }

    handler.updateStock = async function (req, reply) {

        const { body } = req;

        const { products } = body;

        const response = await svcProducts.updateProductsStock({ products });

        reply.send( response );
    }

    handler.getSupplierProductDetails = async function (req, reply) {

        const { body, i8ln } = req;

        const { id_products, id_suppliers } = body

        const details = await svcProducts.getSupplierProductDetails({ id_products, id_suppliers, i8ln });

        reply.send( details );
    }

    handler.sortProducts = async function (req, reply) {

        const sorted = await svcProducts.sortProducts();

        reply.send( sorted );
    }

    handler.updateBulkProductsStock = async function (req, reply) {

        const updated = await svcProducts.updateBulkProductsStock();

        reply.send( updated );
    }

    return handler;
}
