module.exports = function SupplierBankDetailsRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcSupplierBankDetails',
    ], 'supplier_bank_details');

    const {
        svcSupplierBankDetails
    } = handler.di;

    handler.save = async function (req, reply) {

        const { body } = req;

        const { bank_details } = body;

        const bankDetails = await svcSupplierBankDetails.createSupplierBankDetails({ bank_details });

        reply.send( bankDetails );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { bank_details } = body;

        const bankDetails = await svcSupplierBankDetails.updateSupplierBankDetails({ bank_details });

        reply.send( bankDetails );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const bankDetails = await svcSupplierBankDetails.deleteSupplierBankDetails({ id });

        reply.send( bankDetails );
    }

    handler.fetch = async function (req, reply) {

        const { body, pagination } = req;

        const { id_supplier } = body;

        const bankDetails = await svcSupplierBankDetails.getAllSupplierBankDetails({ id_supplier, pagination });

        reply.send( bankDetails );
    }
   
    return handler;
}
