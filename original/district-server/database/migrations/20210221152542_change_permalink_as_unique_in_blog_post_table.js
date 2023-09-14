exports.up = function(knex) {
  return knex.schema.table('blog_post', table => {
    table
      .string('permalink')
      .unique()
      .notNullable()
      .default('')
      .alter();
  });
};

exports.down = function(knex) {
  return knex.schema.table('blog_post', table => {
    table
      .string('permalink')
      .notNullable()
      .default('')
      .alter();
  });
};
