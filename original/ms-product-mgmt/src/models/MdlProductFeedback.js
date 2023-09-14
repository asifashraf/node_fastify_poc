module.exports = function MdlProductFeedback(opts) {

    const { baseModel, guid } = opts;

    const tableName = 'product_feedback_score';

    const model = baseModel(tableName);

    const { link } = model;


    // Store Product Feedback by Order id and product id
    model.createFeedback = async function createFeedback(feedback) {
        let id = guid.v4();
        await link(tableName).insert({
            id: id,
            id_product: feedback.id_product,
            id_order: feedback.id_order,
            created_at: new Date(),
            score: feedback.score,
            comment: feedback.comment,
        })

        return { data: { product_feedback_id: id } };
    }

    // get feedback by order id and product id
    model.getFeedback = async function getFeedback(id_order) {
        // Fetch records using knex link
         let feedback = await link(tableName).where({ id_order: id_order });
         //Return feedback as  array of objects
        return feedback;
    }

    // delete feedback by order id
    model.deleteFeedback = async function deleteFeedback(id_order) {
        // Delete knex table data by order id
        await link(tableName).where({ id_order: id_order }).del();
    }

    // update feedback by id
    model.updateFeedback = async function updateFeedback(feedback) {
        // Update knex table data by order id
        await link(tableName).where({ id: feedback.id }).update({
            score: feedback.score,
            comment: feedback.comment,
        })
    }

    return model;
}
