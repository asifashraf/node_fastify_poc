module.exports = function SuppliersRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcSuppliers',
    ], 'suppliers');

    const {
        svcSuppliers
    } = handler.di;

    handler.save = async function (req, reply) {

        const { body } = req;

        const { supplier } = body;

        const suppliers = await svcSuppliers.createSupplier({ supplier });

        reply.send( suppliers );
    }

    handler.addCommission = async function (req, reply) {

        const { body } = req;

        const { commission } = body;

        const commissions = await svcSuppliers.createCommission({ commission });

        reply.send( commissions );
    }

    handler.fetch = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters } = body;

        const suppliers = await svcSuppliers.getAllSuppliers({ filters, pagination, i8ln });

        reply.send( suppliers );
    }

    handler.update = async function (req, reply) {

        const { body, i8ln } = req;

        const { supplier } = body;

        const suppliers = await svcSuppliers.updateSupplier({ supplier, i8ln });

        reply.send( suppliers );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const suppliers = await svcSuppliers.deleteSupplier({ id });

        reply.send( suppliers );
    }

    handler.specificSupplier = async function(req, reply) {
        const { params } = req;

        const supplier = await svcSuppliers.specificSupplier({ params });

        reply.send(supplier)
    }

    handler.bulkSupplierList = async function(req, reply) {

        const { body } = req;

        const { id_suppliers } = body

        const suppliers = await svcSuppliers.bulkSupplierList({ id_suppliers });

        reply.send(suppliers)
    }
   
    return handler;
}
