module.exports = function SvcSuppliers(opts) {

    const { Boom, logger, mdlSupplierStatus } = opts;

    const getAllSupplierStatus = async () => {
        try {

            const statuses = await mdlSupplierStatus.getAllSupplierStatus();
            return statuses;

        } catch (ex) {
            logger.error(ex, 'SvcSuppliersjs > getAllSupplierStatus > error >');
            throw Boom.notFound(`Error while fetching supplier statuses: ${ex.message}`, ex);
        }
    }

    const orderSupplierStatusUpdate = async (order) => {
        try {

            const statuses = await mdlSupplierStatus.supplierOrderStatusUpdate(order);
            return statuses;

        } catch (ex) {
            logger.error(ex, 'SvcSuppliersjs > orderSupplierStatusUpdate > error >');
            throw Boom.notFound(`Error while updating order supplier status: ${ex.message}`, ex);
        }
    }

    const updateSupplierTrackingInfo = async (tracking) => {
        try {

            const trackingInfo = await mdlSupplierStatus.updateSupplierTrackingInfo(tracking);
            return trackingInfo;

        } catch (ex) {
            logger.error(ex, 'SvcSuppliersjs > updateSupplierTrackingInfo > error >');
            throw Boom.notFound(`Error while updating order tracking of supplier: ${ex.message}`, ex);
        }
    }

    const salasaTrackingWebhook = async (order) => {
        try {

            const trackingInfo = await mdlSupplierStatus.salasaTrackingWebhook(order);
            return trackingInfo;

        } catch (ex) {
            logger.error(ex, 'SvcSuppliersjs > salasaTrackingWebhook > error >');
            throw Boom.notFound(`Error while updating order tracking of supplier webhook: ${ex.message}`, ex);
        }
    }

    return {
        getAllSupplierStatus,
        orderSupplierStatusUpdate,
        updateSupplierTrackingInfo,
        salasaTrackingWebhook
    }
}
