
exports.up = function(knex) {
      return knex.schema.createTable('common_content', table => {
            table.uuid('id')
                .primary()
                .notNullable();
            table.uuid('common_content_category_id')
                .references('id')
                .inTable('common_content_category')
                .index()
                .notNullable();
            table.string('title');
            table.string('title_ar');
            table.string('title_tr');
            table.boolean('is_show_title');
            table.boolean('is_dropdown');
            table.string('icon');
            table.boolean('is_show_icon');
            table.string('subtitle');
            table.string('subtitle_ar');
            table.string('subtitle_tr');
            table.boolean('is_show_subtitle');
            table.string('description');
            table.string('description_ar');
            table.string('description_tr');
            table.boolean('is_show_description');
            table.string('view_style_type');
            table.timestamp('created')
                .notNullable()
                .defaultTo(knex.fn.now());
            table.timestamp('updated')
                .notNullable()
                .defaultTo(knex.fn.now());
        });
};

exports.down = function(knex) {
  return knex.schema.dropTable('common_content');
};
