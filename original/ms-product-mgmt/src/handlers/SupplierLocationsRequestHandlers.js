module.exports = function SupplierLocationsRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcSupplierLocations',
    ], 'supplier_locations');

    const {
        svcSupplierLocations
    } = handler.di;

    handler.save = async function (req, reply) {

        const { body } = req;

        const { location } = body;

        const locations = await svcSupplierLocations.createSupplierLocation({ location });

        reply.send( locations );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { location } = body;

        const locations = await svcSupplierLocations.updateSupplierLocation({ location });

        reply.send( locations );
    }

    handler.fetch = async function (req, reply) {

        const { body, pagination } = req;

        const { filters, id_supplier } = body;

        const locations = await svcSupplierLocations.getAllSupplierLocations({ id_supplier, filters, pagination });

        reply.send( locations );
    }

    handler.bulkSuppliersLocations = async function (req, reply) {

        const { body, i8ln } = req;

        const { filters } = body;

        const locations = await svcSupplierLocations.bulkSuppliersLocations({ filters, i8ln });

        reply.send( locations );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const locations = await svcSupplierLocations.deleteSupplierLocation({ id });

        reply.send( locations );
    }
   
    return handler;
}
