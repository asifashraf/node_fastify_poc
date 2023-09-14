module.exports = function GeneralRequestHandlers(opts) {

    return ({
        health: async function (req, reply) {
            reply.send({ status : true });
        }
    })

}
