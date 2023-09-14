const swagger = require('@fastify/swagger');
const convert = require('joi-to-json');

const pJson = require('../../package.json');

module.exports = function (config) {
    const { apiPrefix, swaggerHost } = config;

    return ({
        module: swagger,
        options: {
            routePrefix: `/${apiPrefix}/documentation`,
            openapi: {
                openapi: '3.0.0',
                info: {
                    title: pJson.name,
                    description: pJson.description,
                    version: pJson.version
                },
                host: `${swaggerHost}`,
                schemes: ['http', 'https'],
                consumes: [
                    'application/json'
                ],
                produces: [
                    'application/json'
                ],
            },
            hideUntagged: false,
            exposeRoute: true,
            transform: ({ schema, url }) => {

                if (url.includes('documentation')) return { schema, url };

                let transformedUrl = url

                if (schema) {
                    const {
                        params,
                        body,
                        querystring,
                        headers,
                        response,
                        ...transformedSchema
                    } = schema

                    if (params) transformedSchema.params = convert(params)
                    if (body) transformedSchema.body = convert(body)
                    if (querystring) transformedSchema.querystring = convert(querystring)
                    if (headers) transformedSchema.headers = convert(headers)
                    if (response) transformedSchema.response = response

                    if (url.startsWith('/internal')) transformedSchema.hide = true

                    if (url.startsWith('/latest_version/endpoint')) transformedUrl = url.replace('latest_version', 'v3')

                    return { schema: transformedSchema, url: transformedUrl }
                }

                return { schema: {}, url: transformedUrl };
            }
        }
    });
};
