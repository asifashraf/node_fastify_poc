exports.up = knex =>
  knex.schema.table('customers', table => {
    table.string('preferred_language', 10).defaultTo('EN');
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('preferred_language');
  });
