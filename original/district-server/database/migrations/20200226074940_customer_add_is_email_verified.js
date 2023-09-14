exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table.boolean('is_email_verified').default(false);
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('is_email_verified');
  });
