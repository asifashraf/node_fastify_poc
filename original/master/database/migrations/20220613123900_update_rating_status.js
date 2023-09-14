exports.up = function (knex) {
    return knex.schema.raw(
        `update order_sets set rating_status = 'UNAVAILABLE' where 15 < date_part('day',now()::timestamp - created_at::timestamp) and (rating_status = 'PENDING' or rating_status = 'SKIPPED');`
    )
}

exports.down = async function (knex) {
    await knex.schema.raw(`update order_sets set rating_status = 'PENDING'`);
};