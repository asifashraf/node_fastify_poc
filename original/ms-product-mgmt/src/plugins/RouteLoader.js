const fp = require('fastify-plugin')

function RouteLoader(fastify, opts, done) {

    const di = fastify.di().cradle;

    const injections = Object.keys(di);

    const requestSchemas = injections.filter(x => x.indexOf('Schema') !== -1);

    for(let requestSchema of requestSchemas) {
        const requests = Object.keys(di[requestSchema]);

        for(let request of requests) {
            const requestObj = di[requestSchema][request];

            let { method } = requestObj;

            const { url } = requestObj;

            method = method.toLowerCase();

            const reqProperties = { ...requestObj };

            delete reqProperties.url;

            fastify[method](url, { ...reqProperties });
        }
    }

    done();
}

module.exports = RouteLoader;