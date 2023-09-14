
exports.up = knex =>
  knex.schema.table('maintenance_assessments', table => {
    table.string('contract_code').nullable();
  });

exports.down = knex =>
  knex.schema.table('maintenance_assessments', table => {
    table.dropColumn('contract_code');
  });

