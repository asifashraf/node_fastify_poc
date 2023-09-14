exports.up = knex => knex.schema.table('customers', t => t.string('photo'));

exports.down = knex =>
  knex.schema.table('customers', t => t.dropColumn('photo'));
