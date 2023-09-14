exports.up = knex =>
  knex.schema.table('customers', table => {
    table.boolean('use_credit_first').default(true);
  });

exports.down = knex =>
  knex.schema.alterTable('customers', table => {
    table.dropColumn('use_credit_first');
  });
