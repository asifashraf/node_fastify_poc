module.exports = function CategoriesRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcCategories',
    ], 'categories');

    const {
        svcCategories
    } = handler.di;

    handler.fetch = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters, fromDashboard } = body;

        const categories = await svcCategories.getAllCategories({ filters, pagination, i8ln, fromDashboard });

        reply.send( categories );
    }

    handler.save = async function (req, reply) {

        const { body } = req;

        const { category } = body;

        const categories = await svcCategories.createCategory({ category });

        reply.send( categories );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const categories = await svcCategories.deleteCategory({ id });

        reply.send( categories );
    }

    handler.categoryFilters = async function (req, reply) {

        const { body, i8ln } = req;

        const { filters } = body;

        const filter = await svcCategories.getFilters({ filters, i8ln });

        reply.send( filter.data );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { category } = body;

        const categories = await svcCategories.updateCategory({ category });

        reply.send( categories );
    }

    handler.getCategoryDetail = async function (req, reply) {

        const { params } = req;

        const category = await svcCategories.getCategoryDetail({ params });

        reply.send( category );
    }

    handler.getCategoriesManufactures = async function (req, reply) {

        const { params, i8ln } = req;

        const category = await svcCategories.getCategoriesManufactures({ params, i8ln });

        reply.send( category );
    }

    return handler;
}
