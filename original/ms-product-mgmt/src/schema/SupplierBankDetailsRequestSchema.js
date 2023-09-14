module.exports = function SupplierLocationsRequestSchema(opts) {
    const { baseRequestSchema, supplierBankDetailsRequestParameters, commonDefinitions } = opts;

    const routeInfo = {
        save: {
            url: '/add-supplier-bank-details',
            method: 'POST',
            schema: {
                body: supplierBankDetailsRequestParameters.createSupplierBankDetailsRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    id: {
                        type: 'string'
                    },
                    id_supplier: {
                        type: 'string'
                    },
                    account_title: {
                        type: 'string'
                    },
                    bank: {
                        type: 'string'
                    },
                    account_number: {
                        type: 'string'
                    },
                    iban_number: {
                        type: 'string',
                        nullable: true
                    },
                    swift_code: {
                        type: 'string',
                        nullable: true
                    },
                    address: {
                        type: 'string',
                        nullable: true
                    },
                    active: {
                        type: 'boolean'
                    },
                },'On successful creation of supplier bank details.')
            }
        }, 

        update: {
            url: '/update-supplier-bank-details',
            method: 'POST',
            schema: {
                body: supplierBankDetailsRequestParameters.updateSupplierBankDetailsRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    id: {
                        type: 'string'
                    },
                    id_supplier: {
                        type: 'string'
                    },
                    account_title: {
                        type: 'string'
                    },
                    account_number: {
                        type: 'string'
                    },
                    bank: {
                        type: 'string'
                    },
                    iban_number: {
                        type: 'string',
                        nullable: true
                    },
                    swift_code: {
                        type: 'string',
                        nullable: true
                    },
                    address: {
                        type: 'string',
                        nullable: true
                    },
                    active: {
                        type: 'boolean'
                    },
                },'On successful updation of supplier bank details.')
            }
        },

        fetch: {
            url: '/supplier-bank-details',
            method: 'POST',
            schema: {
                body: supplierBankDetailsRequestParameters.getAllSupplierBankDetailsRequestBody(),
            }
        },

        delete: {
            url: '/delete-supplier-bank-details',
            method: 'POST',
            schema: {
                body: supplierBankDetailsRequestParameters.deleteSupplierBankDetailsRequestBody(),
            }
        },
    };

    const schema = baseRequestSchema('supplierBankDetailsRequestHandlers', routeInfo)

    return schema;
}
