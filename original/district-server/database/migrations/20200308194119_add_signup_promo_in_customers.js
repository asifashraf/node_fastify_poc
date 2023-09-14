exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table
      .uuid('signup_promo_id')
      .references('id')
      .inTable('signup_promos')
      .index()
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('signup_promo_id');
  });
