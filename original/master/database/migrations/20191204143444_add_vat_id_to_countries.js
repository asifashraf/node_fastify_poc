exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.string('vat_id');
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('vat_id');
  });
