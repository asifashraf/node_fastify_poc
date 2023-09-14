
exports.up = function (knex) {
    return knex.schema.createTable('cofe_short_url_logs', (table) => {
        table.string('short_id').notNullable().index();
        table.text('original_url').notNullable().index();
        table.integer('url_ttl').default(60); //minutes
        table.timestamps(false, true);
    })
};

exports.down = function (knex) {
    return knex.schema.dropTable('cofe_short_url_logs');
};
