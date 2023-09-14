module.exports = function ProductFeedbackHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcProductFeedback',
    ], 'feedback');

    const {
        svcProductFeedback
    } = handler.di;


    handler.save = async function (req, reply) {

        const { body } = req;

        const { feedback } = body;

        const result = await svcProductFeedback.createFeedback({ feedback });

        reply.send( result );
    }

    // Fetch feedback by id_order, id_product
    handler.fetch = async function (req, reply) {

        const { query } = req;

        const result = await svcProductFeedback.getFeedback(query.id_order);

        reply.send( result );
    }

    // Delete function
     handler.delete = async function (req, reply) {

         const { query } = req;

         await svcProductFeedback.deleteFeedback(query.id_order);

         reply.send({});

     }

     //Patch api
    handler.patch = async function (req, reply) {
        const { body } = req;

        const { feedback } = body;

        const result = await svcProductFeedback.updateFeedback(feedback);

        reply.send( result );
    }


    return handler;
}
