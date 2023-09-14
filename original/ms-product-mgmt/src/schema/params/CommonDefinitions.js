module.exports = function CommonSchemaDefinitions(opts) {
    return ({
        createResponseSchema: (definition, description, type = 'object') => {

            const _oneOf = [];

            if (type === 'object') _oneOf.push({
                type: 'object',
                properties: definition,
            });

            if (type === 'array') _oneOf.push({
                type: 'array',
                items: definition,
            })

            _oneOf.push({ type: 'null' });

            return {
                200: {
                    description,
                    type: 'object',
                    properties: {
                        data: {
                            oneOf: _oneOf,
                        },
                        subcode: { type: 'string' },
                        message: { type: 'string' },
                        pagination: {
                            type: 'object', 
                            nullable: true,
                            properties: {
                                total:  { type: 'number' },
                                lastPage: { type: 'number' },
                                perPage:  { type: 'number' },
                                currentPage: { type: 'number' },
                                from:  { type: 'number' },
                                to:  { type: 'number' },
                            }
                        },
                        errorDetails: {
                            oneOf: [
                                { type: 'object', nullable: true },
                                { type: 'array', nullable: true }
                            ],
                        },
                        statusCode: { type: 'number' },
                    }
                },
            }
        }
    })
}