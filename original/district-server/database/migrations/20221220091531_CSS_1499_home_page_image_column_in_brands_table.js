
exports.up = function (knex) {
  return knex.schema
    .alterTable('brands', table => {
      table.string('cover_image').defaultTo('');
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('brands', table => {
      table.dropColumn('cover_image');
    })
};