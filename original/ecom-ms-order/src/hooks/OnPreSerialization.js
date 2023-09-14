const subcodes = require('../helpers/Subcodes')();
const subcodeMessages = require('../helpers/SubcodeMessages')();

module.exports = async function(request, reply, payload) {

    const { logger } = this.di().cradle;

    logger.info({ reqId: request.id, body: request.body }, `Request > Body >`);
    logger.info({ reqId: request.id, payload }, `Response > Body >`);

    if (request.url.includes('documentation')) return payload;

    if (payload.data === null && payload.subcode) return payload;

    const response = {
        ...payload,
    }

    if (reply.statusCode === 200) {
        response['subcode'] = subcodes.API_RESULT_SUCCESS;
        response['message'] = subcodeMessages[subcodes.API_RESULT_SUCCESS];
    }

    return response;

}
