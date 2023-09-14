/* eslint-disable array-callback-return */
const fp = require('fastify-plugin');

const responseDecorator = function (fastify, opts, done) {

    fastify.addHook('preSerialization', async function preSerialization(request, reply, payload) {

        fastify.log.info({ reqId: request.id, query: request.querystring }, 'Request > Query String >');
        fastify.log.info({ reqId: request.id, body: request.body }, 'Request > Body >');
        fastify.log.info({ reqId: request.id, payload }, 'Response > Body >');
        // let message = payload.message;
        // if (reply.statusCode !== 200) {
        //     let error = payload.data[0].message
        //     message = error.replace(/['"]+/g, '');
        //     payload.data = null
        // }

        // return {
        //     code: reply.statusCode,
        //     message: message,
        //     data: payload.data,
        //     pagination: payload.pagination
        // }
    });

    done();
};

module.exports = fp(responseDecorator, {
    name: 'responseDecorator',
    fastify: '4.x',
});
