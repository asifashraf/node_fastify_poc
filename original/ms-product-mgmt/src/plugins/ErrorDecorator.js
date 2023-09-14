const fp = require('fastify-plugin')

function ErrorDecorator(fastify, opts, done) {

    fastify.setErrorHandler(function (error, request, reply) {
        const {
            Boom,
            subcodes,
            subcodeMessages
        } = fastify.di().cradle;

        fastify.log.error(error, `errorHandler > error >`);

        if (error && error.isJoi) {
            error = Boom.badRequest(subcodeMessages[subcodes.JOI_VALIDATION_FAILURE], {
                subcode: subcodes.JOI_VALIDATION_FAILURE,
                details: error.details
            });
        }

        if (reply.statusCode === 429) {
            error.message = 'Too many actions were performed. Please wait before trying again.'
        }

        if (error && error.isBoom) {
            const payload = {
                subcode: error.data?.subcode || subcodes.DEFAULT_ERROR_SUBCODE,
                message: `${error.output.payload.error}: ${error.message}`,
                statusCode: error.output.payload.statusCode,
                errorDetails: error.data?.details || [],
                data: null,
            }

            reply
                .code(200)
                .type('application/json')
                .headers(error.output.headers)
                .send(payload);

            return;
        }

        if (error) {
            const payload = {
                subcode: subcodes.INTERNAL_SERVER_ERROR,
                message: `${error?.name || 'Error'}: ${error.message}`,
                statusCode: 500,
                errorDetails: error?.stack || [],
                data: null,
            }

            reply
                .code(200)
                .type('application/json')
                .send(payload);

            return;
        }

        reply.send(error || new Boom('Got non-error: ' + error));
    });

    done();
}

module.exports = fp(ErrorDecorator, {
    name: 'errorDecorator',
    fastify: '4.x',
})
