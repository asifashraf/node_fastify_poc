module.exports = function SuppliersRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcSuppliers',
    ], 'orders');

    const {
        svcSuppliers
    } = handler.di;

    handler.getAllSupplierStatus = async function (req, reply) {

        const statuses = await svcSuppliers.getAllSupplierStatus();

        reply.send( statuses );
    }

    handler.orderSupplierStatusUpdate = async function (req, reply) {

        const { body } = req;

        const { order } = body

        const status = await svcSuppliers.orderSupplierStatusUpdate(order);

        reply.send( status );
    }

    handler.updateSupplierTrackingInfo = async function (req, reply) {

        const { body } = req;

        const { tracking } = body

        const data = await svcSuppliers.updateSupplierTrackingInfo(tracking);

        reply.send( data );
    }

    handler.salasaTrackingWebhook = async function (req, reply) {

        const { body } = req;

        const { order } = body

        const data = await svcSuppliers.salasaTrackingWebhook(order);

        reply.send( data );
    }

    return handler;
}
