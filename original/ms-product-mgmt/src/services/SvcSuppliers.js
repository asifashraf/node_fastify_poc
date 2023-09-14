module.exports = function SvcSuppliers(opts) {

    const { Boom, logger, mdlSuppliers, i18n } = opts;

    const getAllSuppliers = async ({ filters, pagination, i8ln }) => {
        try {

            const suppliers = await mdlSuppliers.getAll(filters, pagination, i8ln);

            return suppliers;

        } catch (ex) {
            logger.error({ msg: 'SvcSuppliersjs > getAllSuppliers > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createSupplier = async ({ supplier }) => {
        try {

            const suppliers = await mdlSuppliers.createSupplier(supplier);
            return suppliers;

        } catch (ex) {
            logger.error({ msg: 'SvcSuppliersjs > createSupplier > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createCommission = async ({ commission }) => {
        try {

            const commissions = await mdlSuppliers.createCommission(commission);
            return commissions;

        } catch (ex) {
            logger.error({ msg: 'SvcSuppliersjs > createCommission > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateSupplier = async ({ supplier, i8ln }) => {
        try {

            const suppliers = await mdlSuppliers.updateSupplier(supplier, i8ln);
            return suppliers;

        } catch (ex) {
            logger.error({ msg: 'SvcSuppliersjs > updateSupplier > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteSupplier = async ({ id }) => {
        try {

            const suppliers = await mdlSuppliers.deleteSupplier(id);
            return suppliers;

        } catch (ex) {
            logger.error({ msg: 'SvcSuppliersjs > deleteSupplier > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const specificSupplier = async ({ params }) => {
        try {

            const suppliers = await mdlSuppliers.specificSupplier(params);
            return suppliers;

        } catch (ex) {
            logger.error({ msg: 'SvcSuppliersjs > specifcSupplier > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const bulkSupplierList = async ({ id_suppliers }) => {
        try {

            const suppliers = await mdlSuppliers.bulkSupplierList(id_suppliers);
            return suppliers;

        } catch (ex) {
            logger.error({ msg: 'SvcSuppliersjs > bulkSupplierList > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllSuppliers,
        createSupplier,
        createCommission,
        updateSupplier,
        deleteSupplier,
        specificSupplier,
        bulkSupplierList,
    }
}
