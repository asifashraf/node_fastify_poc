module.exports = function SupplierRequestSchema(opts) {
    const { baseRequestSchema, supplierRequestParameters, commonDefinitions, commonRequestHeaders } = opts;

    const routeInfo = {
        save: {
            url: '/add-supplier',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.createSupplierRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    supplier_id: {
                        type: 'string',
                        example: '18d02ffe-8c1a-425b-a3dd-eb03e590f9a4',
                    },
                    business_model:{
                        type: 'string',
                        example: 'marketplace',
                    },
                    supplier_metadata: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id:{
                                    type: 'string'
                                },
                                id_supplier:{
                                    type: 'string'
                                },
                                id_lang:{
                                    type: 'string'
                                },
                                name:{
                                    type: 'string'
                                },
                                description:{
                                    type: ['string', 'null']
                                }
                            },
                            example:{
                                id: 'e89c88e8-49b3-4003-94b2-72737827ac47',
                                id_category: '030bdf09-57e2-440e-8516-51f631183eb7',
                                id_lang: '0025fc96-cae0-44f2-8203-c52101ab1a48',
                                name: 'The Premier Supplier',
                                description: 'The Premier Supplier description'
                            }
                        }
                    }
                },'On successful creation of supplier.')
            }
        },

        addCommission: {
            url: '/add-supplier-category-commission',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.createSupplierCategoryCommissionRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    supplier_id: {
                        type: 'string',
                        example: '18d02ffe-8c1a-425b-a3dd-eb03e590f9a4',
                    },
                    supplier_category_commission: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id:{
                                    type: 'string'
                                },
                                id_category:{
                                    type: 'string'
                                },
                                id_supplier:{
                                    type: 'string'
                                },
                                commission_percentage:{
                                    type: 'string'
                                }
                            },
                            example:{
                                id: 'e89c88e8-49b3-4003-94b2-72737827ac47',
                                id_category: '030bdf09-57e2-440e-8516-51f631183eb7',
                                id_supplier: '18d02ffe-8c1a-425b-a3dd-eb03e590f9a4',
                                descommission_percentage: '7'
                            }
                        }
                    }
                },'On successful addition of a category commission for a supplier.',)
            }
        },

        fetch: {
            url: '/suppliers',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.getAllSuppliersRequestBody(),
                response: commonDefinitions.createResponseSchema(
                    {
                        type: 'object',
                        properties: {
                            id:{
                                type: 'string'
                            },
                            name:{
                                type: 'string'
                            },
                            businessModel:{
                                type: 'string'
                            },
                            phone:{
                                type: 'string'
                            },
                            email:{
                                type: 'string'
                            },
                            vatNumber:{
                                type: 'string'
                            },
                            serviceEmail:{
                                type: 'string',
                                nullable: true
                            },
                            servicePhone:{
                                type: 'string',
                                nullable: true
                            },
                            commission:{
                                type: 'number',
                                nullable: true
                            },
                            description:{
                                type: 'string',
                                nullable: true
                            },
                            numberOfProducts:{
                                type: 'string',
                                nullable: true
                            },
                            active:{
                                type: 'boolean'
                            },
                        } 
                    },
                    'On successful fetching the list of suppliers.',
                    'array'
                )
            }
        },

        update: {
            url: '/update-supplier',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.updateSupplierRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    supplier_id: {
                        type: 'string',
                        example: '18d02ffe-8c1a-425b-a3dd-eb03e590f9a4',
                    },
                    business_model: {
                        type: 'string',
                        example: 'marketplace',
                    },
                    supplier_metadata: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id:{
                                    type: 'string'
                                },
                                id_supplier:{
                                    type: 'string'
                                },
                                id_lang:{
                                    type: 'string'
                                },
                                name:{
                                    type: 'string'
                                },
                                description:{
                                    type: ['string', 'null']
                                }
                            },
                            example:{
                                id: 'e89c88e8-49b3-4003-94b2-72737827ac47',
                                id_category: '030bdf09-57e2-440e-8516-51f631183eb7',
                                id_lang: '0025fc96-cae0-44f2-8203-c52101ab1a48',
                                name: 'The Premier Supplier',
                                description: 'The Premier Supplier description'
                            }
                        }
                    }
                },'On successful updation of supplier.')
            }
        },

        delete: {
            url: '/delete-supplier',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.deleteSuppliersRequestBody(),
                response: commonDefinitions.createResponseSchema({
                    supplier_id: {
                        type: 'string',
                        example: '18d02ffe-8c1a-425b-a3dd-eb03e590f9a4',
                    }
                },'On successful deletion of supplier.')
            }
        },

        specificSupplier: {
            url: '/supplier/:id',
            method: 'GET',
            schema: {
                params: supplierRequestParameters.getSpecificSupplier(),
                schema: {
                    headers: commonRequestHeaders.defaultHeaders(),
                }
            }
        },

        bulkSupplierList: {
            url: '/bulk-suppliers',
            method: 'POST',
            schema: {
                body: supplierRequestParameters.getBulkSuppliersListRequestBody(),
                schema: {
                    headers: commonRequestHeaders.defaultHeaders(),
                }
            }
        },
    };

    const schema = baseRequestSchema('suppliersRequestHandlers', routeInfo)

    return schema;
}
