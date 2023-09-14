exports.up = function(knex) {
  return knex.schema.alterTable('common_content', table => {
    table.integer('order')
          .default(0);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('common_content', table => {
    table.dropColumn('order');
  });
};
