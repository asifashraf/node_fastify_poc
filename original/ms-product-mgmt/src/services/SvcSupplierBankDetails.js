module.exports = function SvcSupplierBankDetails(opts) {

    const { Boom, logger, mdlSupplierBankDetails, i18n } = opts;

    const getAllSupplierBankDetails = async ({ id_supplier, pagination }) => {
        try {

            const bankDetails = await mdlSupplierBankDetails.getAllSupplierBankDetails(id_supplier, pagination);

            return bankDetails;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierBankDetailsjs > getAllSupplierBankDetails > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const createSupplierBankDetails = async ({ bank_details }) => {
        try {

            const bankDetails = await mdlSupplierBankDetails.createSupplierBankDetails(bank_details);
            return bankDetails;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierBankDetailsjs > createSupplierBankDetails > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const updateSupplierBankDetails = async ({ bank_details }) => {
        try {

            const bankDetails = await mdlSupplierBankDetails.updateSupplierBankDetails(bank_details);
            return bankDetails;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierBankDetailsjs > updateSupplierBankDetails > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteSupplierBankDetails = async ({ id }) => {
        try {

            const bankDetails = await mdlSupplierBankDetails.deleteSupplierBankDetails(id);
            return bankDetails;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierBankDetailsjs > deleteSupplierBankDetails > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        getAllSupplierBankDetails,
        createSupplierBankDetails,
        updateSupplierBankDetails,
        deleteSupplierBankDetails,
    }
}
