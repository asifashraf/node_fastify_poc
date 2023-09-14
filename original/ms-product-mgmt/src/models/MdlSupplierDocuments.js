module.exports = function MdlSupplierDocuments(opts) {

    const { baseModel, guid, knexnest, config } = opts;

    const { cloudfront_url, supplier_bucket } = config

    const model = baseModel('supplier_documents');

    const { link } = model;

    model.createSupplierDocument = async function createSupplierDocument(document) {

        document.id =  guid.v4()

       const supplier  = await link('suppliers')
            .where({ id : document.id_supplier })
            .first('id')

        if (!supplier){
            throw new Error(`supplier_not_exists`)
        }

        const [ supplierDocument ] = await link('supplier_documents').insert(document)
            .onConflict(['id_supplier'])
            .merge({
                vat_certificate: document.vat_certificate,
                company_registration_certificate: document.company_registration_certificate,
                updated_at: this.now(),
                deleted_at: null,
            })
            .returning('*');


        return { data: { ...supplierDocument  } }
    }

    model.updateSupplierDocument = async function updateSupplierDocument(document) {

        const { id } = document

        document.updated_at = this.now()

        const [ supplierDocument ] = await this.update(document, { id , deleted_at: null})

        if (!supplierDocument){
            throw new Error(`supplier_document_not_exists`)
        }

        return { data: { ...supplierDocument  } }
    }

    model.getSupplierDocuments = async function getSupplierDocuments(id_supplier) {

        let _link = link
            .select(
                'sd.id as _id',
                'sd.id_supplier as _idSupplier',
                'sd.vat_certificate as _vatCertificate',
                'sd.company_registration_certificate as _companyRegistrationCertificate',
            )
            .from('supplier_documents as sd')
            .where('sd.id_supplier', id_supplier)
            .whereNull('sd.deleted_at')

        let result = await _link;

        result = {
            data : knexnest.nest(result)
        }

        for (let index = 0; index < result?.data?.length; index++) {
            const document = result.data[index]
            if (document.vatCertificate){
                document.vatCertificate = `${cloudfront_url}${supplier_bucket}${document.vatCertificate}`
            }

            if (document.companyRegistrationCertificate){
                document.companyRegistrationCertificate = `${cloudfront_url}${supplier_bucket}${document.companyRegistrationCertificate}`
            }
        }

        return result;
    }

    model.deleteSupplierDocuments = async function deleteSupplierDocuments(id, documentType) {

        const letsUpdate = {}

        if (documentType === 'vat') {
            letsUpdate.vat_certificate = null
        }

        if (documentType === 'registration') {
            letsUpdate.company_registration_certificate = null
        }

        letsUpdate.updated_at = this.now()

        const [ supplierDocument ] = await this.update(letsUpdate, { id , deleted_at: null})

        if (!supplierDocument){
            throw new Error(`supplier_document_not_exists`)
        }

        if (!supplierDocument.vat_certificate && !supplierDocument.company_registration_certificate){
            await this.softDelete(
                {
                    id,
                    deleted_at: null
                },
                { deleted_at: this.now() }
            );
        }

        return { data: { ...supplierDocument  } }
    }

    return model
}
