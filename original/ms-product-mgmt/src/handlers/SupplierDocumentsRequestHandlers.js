module.exports = function SupplierDocumentsRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcSupplierDocuments',
    ], 'supplier_documents');

    const {
        svcSupplierDocuments
    } = handler.di;

    handler.save = async function (req, reply) {

        const { body } = req;

        const { document } = body;

        const documents = await svcSupplierDocuments.createDocuments({ document });

        reply.send( documents );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { document } = body;

        const documents = await svcSupplierDocuments.updateDocuments({ document });

        reply.send( documents );
    }

    handler.fetch = async function (req, reply) {

        const { body } = req;

        const { id_supplier } = body;

        const documents = await svcSupplierDocuments.getDocuments({ id_supplier });

        reply.send( documents );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id, documentType } = body;

        const documents = await svcSupplierDocuments.deleteDocuments({ id, documentType });

        reply.send( documents );
    }
   
    return handler;
}
