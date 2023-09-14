module.exports = function SupplierLocationsRequestSchema(opts) {
    const { baseRequestSchema, supplierLocationsRequestParameters, commonDefinitions } = opts;

    const routeInfo = {
        save: {
            url: '/add-supplier-location',
            method: 'POST',
            schema: {
                body: supplierLocationsRequestParameters.createSupplierLocationsRequestBody(),
                 response: commonDefinitions.createResponseSchema({
                    id: {
                        type: 'string'
                    },
                    id_supplier: {
                        type: 'string'
                    },
                    first_name: {
                        type: 'string'
                    },
                    last_name: {
                        type: 'string'
                    },
                    alias: {
                        type: 'string',
                        nullable: true
                    },
                    company: {
                        type: 'string',
                        nullable: true
                    },
                    address: {
                        type: 'string'
                    },
                    id_country: {
                        type: 'string'
                    },
                    country_name: {
                        type: 'string'
                    },
                    id_city: {
                        type: 'string'
                    },
                    city_name: {
                        type: 'string'
                    },
                    phone: {
                        type: 'string'
                    },
                    mobile: {
                        type: 'string',
                        nullable: true
                    },
                    postcode: {
                        type: 'string',
                        nullable: true
                    },
                    active: {
                        type: 'boolean'
                    },
                },'On successful creation of suppliers location.')
            }
        }, 

        update: {
            url: '/update-supplier-location',
            method: 'POST',
            schema: {
                body: supplierLocationsRequestParameters.updateSupplierLocationsRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    id: {
                        type: 'string'
                    },
                    id_supplier: {
                        type: 'string'
                    },
                    first_name: {
                        type: 'string'
                    },
                    last_name: {
                        type: 'string'
                    },
                    alias: {
                        type: 'string',
                        nullable: true
                    },
                    company: {
                        type: 'string',
                        nullable: true
                    },
                    address: {
                        type: 'string'
                    },
                    id_country: {
                        type: 'string'
                    },
                    country_name: {
                        type: 'string'
                    },
                    id_city: {
                        type: 'string'
                    },
                    city_name: {
                        type: 'string'
                    },
                    phone: {
                        type: 'string'
                    },
                    mobile: {
                        type: 'string',
                        nullable: true
                    },
                    postcode: {
                        type: 'string',
                        nullable: true
                    },
                    active: {
                        type: 'boolean'
                    },
                },'On successful updation of suppliers location.')
            }
        },

        fetch: {
            url: '/supplier-locations',
            method: 'POST',
            schema: {
                body: supplierLocationsRequestParameters.getAllSupplierLocationsRequestBody(),
            }
        },

        delete: {
            url: '/delete-supplier-location',
            method: 'POST',
            schema: {
                body: supplierLocationsRequestParameters.deleteSupplierLocationRequestBody(),
            }
        },

        bulkSuppliersLocations: {
            url: '/bulk-suppliers-locations',
            method: 'POST',
            schema: {
                body: supplierLocationsRequestParameters.getMultipleSuppliersLocationsRequestBody(),
            }
        },
    };

    const schema = baseRequestSchema('supplierLocationsRequestHandlers', routeInfo)

    return schema;
}
