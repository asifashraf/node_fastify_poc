module.exports = function SvcCategories(opts) {

    const { Boom, logger, mdlCategories, i18n } = opts;

    const getAllCategories = async ({ filters, pagination, i8ln, fromDashboard }) => {
        try {

            const categories = await mdlCategories.getAll(filters, pagination, i8ln, fromDashboard);

            return categories;

        } catch (ex) {
            logger.error({ msg: 'SvcCategoriesjs > getAllCategories > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createCategory = async ({ category }) => {
        try {

            const categories = await mdlCategories.createCategory(category);
            return categories;

        } catch (ex) {
            logger.error({ msg: 'SvcCategoriesjs > createCategories > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteCategory = async ({ id }) => {
        try {

            const categories = await mdlCategories.deleteCategory(id);
            return categories;

        } catch (ex) {
            logger.error({ msg: 'SvcCategoriesjs > deleteCategories > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateCategory = async ({ category }) => {
        try {

            const categories = await mdlCategories.updateCategory(category);
            return categories;

        } catch (ex) {
            logger.error({ msg: 'SvcCategoriesjs > updateCategories > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const getFilters = async ({ filters, i8ln }) => {
        try {

            const filter = await mdlCategories.getFilters(filters, i8ln);
            return filter;

        } catch (ex) {
            logger.error({ msg: 'SvcCategoriesjs > getFilters > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const getCategoryDetail = async ({params}) => {
        try {

            const category = await mdlCategories.categoryDetail(params);
            return category;

        } catch (ex) {
            logger.error({ msg: 'SvcCategoriesjs > CategoryDetail > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const getCategoriesManufactures = async ({params, i8ln}) => {
        try {

            const category = await mdlCategories.getCategoriesManufactures(params, i8ln);
            return category;

        } catch (ex) {
            logger.error({ msg: 'SvcCategoriesjs > CategoriesManufactures > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllCategories,
        createCategory,
        deleteCategory,
        getFilters,
        updateCategory,
        getCategoryDetail,
        getCategoriesManufactures
    }

}
