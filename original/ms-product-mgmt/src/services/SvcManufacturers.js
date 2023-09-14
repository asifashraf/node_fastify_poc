module.exports = function SvcManufacturers(opts) {

    const { Boom, logger, mdlManufacturers, i18n } = opts;

    const getAllManufacturers = async ({ filters, pagination, i8ln }) => {
        try {

            const manufacturers = await mdlManufacturers.getAll( filters, pagination, i8ln );

            return manufacturers;

        } catch (ex) {
            logger.error({ msg: 'SvcManufacturersjs > getAllManufacturers > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createManufacturer = async ({ manufacturer }) => {
        try {

            const manufacturers = await mdlManufacturers.createManufacturer(manufacturer);
            return manufacturers;

        } catch (ex) {
            logger.error({ msg: 'SvcManufacturersjs > createManufacturer > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteManufacturer = async ({id}) => {
        try {

            const manufacturer = await mdlManufacturers.deleteManufacturer(id);
            return manufacturer;

        } catch (ex) {
            logger.error({ msg: 'SvcManufacturersjs > deleteManufacturer > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateManufacturer = async ({ manufacturer }) => {
        try {
            const manufacturers = await mdlManufacturers.updateManufacturer(manufacturer);
            return manufacturers;

        } catch (ex) {
            logger.error({ msg: 'SvcManufacturersjs > updateManufacturer > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const getManufacturerDetail = async ({params}) => {
        try {

            const manufacturer = await mdlManufacturers.manufacturerDetail(params);
            return manufacturer;

        } catch (ex) {
            logger.error({ msg: 'SvcManufacturersjs > ManufacturerDetail > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllManufacturers,
        createManufacturer,
        deleteManufacturer,
        updateManufacturer,
        getManufacturerDetail
    }

}
