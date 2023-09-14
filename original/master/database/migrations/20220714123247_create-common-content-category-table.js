
exports.up = function(knex) {
  return knex.schema.createTable('common_content_category', table => {
        table.uuid('id')
            .primary()
            .notNullable();
        table.string('slug');
        table.string('title');
        table.string('title_ar');
        table.string('title_tr');
        table.timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table.timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
return knex.schema.dropTable('common_content_category');
};
