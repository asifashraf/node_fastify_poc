module.exports = function SvcSupplierDocuments(opts) {

    const { Boom, logger, mdlSupplierDocuments, i18n } = opts;

    const createDocuments = async ({ document }) => {
        try {

            const documents = await mdlSupplierDocuments.createSupplierDocument(document);
            return documents;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierDocuments > createDocuments > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }


    const updateDocuments = async ({ document }) => {
        try {

            const documents = await mdlSupplierDocuments.updateSupplierDocument(document);
            return documents;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierDocumentsjs > updateDocuments > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const getDocuments = async ({ id_supplier }) => {
        try {

            const documents = await mdlSupplierDocuments.getSupplierDocuments(id_supplier);
            return documents;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierDocumentsjs > getDocuments > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    const deleteDocuments = async ({ id, documentType }) => {
        try {

            const documents = await mdlSupplierDocuments.deleteSupplierDocuments(id, documentType);
            return documents;

        } catch (ex) {
            logger.error({ msg: 'SvcSupplierDocumentsjs > deleteDocuments > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        createDocuments,
        updateDocuments,
        getDocuments,
        deleteDocuments,
    }
}
