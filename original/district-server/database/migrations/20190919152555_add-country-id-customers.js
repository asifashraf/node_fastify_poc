exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table
      .uuid('country_id')
      .references('id')
      .inTable('countries')
      .index();
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('country_id');
  });
