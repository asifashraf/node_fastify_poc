exports.up = function(knex) {
  return knex.schema.alterTable('common_content_category', table => {
    table.unique('slug');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('common_content_category', table => {
    table.dropUnique('slug');
  });
};
