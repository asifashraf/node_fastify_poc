exports.up = knex =>
  knex.schema.table('customers', table => {
    table.date('birthday');
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('birthday');
  });
