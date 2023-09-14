module.exports = function SvcProductFeedback(opts) {

    const { Boom, logger, mdlProductFeedback } = opts;

    // Store feedback
    const createFeedback = async ({ feedback }) => {
        try {

            return await mdlProductFeedback.createFeedback(feedback);

        } catch (ex) {
            logger.error({ msg: 'SvcProductFeedback > create > error >', ex });
            throw Boom.notFound(`Error while creating feedback: ${ex.message}`, ex);
        }
    }

    // Get Feedback
    const getFeedback = async ( id_order ) => {
        try {

            return await mdlProductFeedback.getFeedback( id_order );

        } catch (ex) {
            logger.error({ msg: 'SvcProductFeedback > getFeedback > error >', ex });
            throw Boom.notFound(`Error while getting feedback: ${ex.message}`, ex);
        }
    }

    // Delete function
    const deleteFeedback = async ( id_order ) => {
        try {

            await mdlProductFeedback.deleteFeedback( id_order );

        } catch (ex) {
            logger.error({ msg: 'SvcProductFeedback > deleteFeedback > error >', ex });
            throw Boom.notFound(`Error while deleting feedback: ${ex.message}`, ex);
        }
    }

    // update feedback
     const updateFeedback = async ( feedback ) => {
        try {

             await mdlProductFeedback.updateFeedback( feedback );

         } catch (ex) {
             logger.error({ msg: 'SvcProductFeedback > updateFeedback > error >', ex });
             throw Boom.notFound(`Error while updating feedback: ${ex.message}`, ex);
         }
     }

    return {
        createFeedback,
        getFeedback,
        deleteFeedback,
        updateFeedback
    }

}
