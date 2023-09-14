exports.up = knex =>
  knex.schema.alterTable('blog_post', table => {
    table
      .string('permalink', 255)
      .notNullable()
      .default('');
  });

exports.down = knex =>
  knex.schema.table('blog_post', table => {
    table.dropColumn('permalink');
  });
