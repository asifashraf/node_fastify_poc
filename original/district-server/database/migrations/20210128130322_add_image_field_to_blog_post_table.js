exports.up = function(knex) {
  return knex.schema.table('blog_post', table =>
    table.string('image', 500).nullable()
  );
};

exports.down = function(knex) {
  return knex.schema.table('blog_post', table => table.dropColumn('image'));
};
