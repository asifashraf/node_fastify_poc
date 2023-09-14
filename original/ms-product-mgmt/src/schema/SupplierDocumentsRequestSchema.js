module.exports = function SupplierDocumentsRequestSchema(opts) {
    const { baseRequestSchema, supplierDocumentsRequestParameters, commonDefinitions } = opts;

    const routeInfo = {
        save: {
            url: '/add-supplier-document',
            method: 'POST',
            schema: {
                body: supplierDocumentsRequestParameters.createSupplierDocumentsRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    id: {
                        type: 'string',
                    },
                    id_supplier: {
                        type: 'string',
                    },
                    vat_certificate: {
                        type: 'string',
                        nullable: true
                    },
                    company_registration_certificate: {
                        type: 'string',
                        nullable: true
                    },
                },'On successful creation of suppliers document.')
            }
        }, 

        update: {
            url: '/update-supplier-document',
            method: 'POST',
            schema: {
                body: supplierDocumentsRequestParameters.updateSupplierDocumentsRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    id: {
                        type: 'string',
                    },
                    id_supplier: {
                        type: 'string',
                    },
                    vat_certificate: {
                        type: 'string',
                        nullable: true
                    },
                    company_registration_certificate: {
                        type: 'string',
                        nullable: true
                    },
                },'On successful updation of suppliers documents.')
            }
        },

        fetch: {
            url: '/supplier-documents',
            method: 'POST',
            schema: {
                body: supplierDocumentsRequestParameters.getSupplierDocumentsRequestBody(),
                response: commonDefinitions.createResponseSchema(
                    {
                        type: 'object',
                        properties: {
                            id:{
                                type: 'string'
                            },
                            idSupplier:{
                                type: 'string'
                            },
                            vatCertificate:{
                                type: 'string',
                                nullable: true
                            },
                            companyRegistrationCertificate:{
                                type: 'string',
                                nullable: true
                            },
                        } 
                    },
                    'On successful fetching the list of suppliers documents.',
                    'array'
                )
            }
        },

        delete: {
            url: '/delete-supplier-document',
            method: 'POST',
            schema: {
                body: supplierDocumentsRequestParameters.deleteSupplierDocumentsRequestBody(),
            }
        },
    };

    const schema = baseRequestSchema('supplierDocumentsRequestHandlers', routeInfo)

    return schema;
}
