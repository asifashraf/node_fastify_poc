module.exports = function SvcSupplierLocations(opts) {

    const { Boom, logger, mdlSupplierLocations, i18n } = opts;

    const getAllSupplierLocations = async ({ id_supplier, filters, pagination }) => {
        try {

            const suppliers = await mdlSupplierLocations.getAllSupplierLocations(id_supplier, filters, pagination);

            return suppliers;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierLocationsjs > getAllSupplierLocations > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const bulkSuppliersLocations = async ({ filters, i8ln }) => {
        try {

            const locations = await mdlSupplierLocations.bulkSuppliersLocations(filters, i8ln);

            return locations;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierLocationsjs > bulkSuppliersLocations > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createSupplierLocation = async ({ location }) => {
        try {

            const locations = await mdlSupplierLocations.createSupplierLocation(location);
            return locations;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierLocationsjs > createSupplierLocation > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }


    const updateSupplierLocation = async ({ location }) => {
        try {

            const locations = await mdlSupplierLocations.updateSupplierLocation(location);
            return locations;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierLocationsjs > updateSupplierLocation > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteSupplierLocation = async ({ id }) => {
        try {

            const location = await mdlSupplierLocations.deleteSupplierLocation(id);
            return location;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierLocationsjs > deleteSupplierLocation > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllSupplierLocations,
        createSupplierLocation,
        updateSupplierLocation,
        deleteSupplierLocation,
        bulkSuppliersLocations
    }
}
