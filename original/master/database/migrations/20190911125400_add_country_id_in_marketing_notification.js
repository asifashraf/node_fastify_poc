exports.up = knex =>
  knex.schema.table('marketing_notifications', table => {
    table
      .uuid('country_id')
      .references('id')
      .inTable('countries')
      .index();
  });

exports.down = knex =>
  knex.schema.table('marketing_notifications', table => {
    table.dropColumn('country_id');
  });
