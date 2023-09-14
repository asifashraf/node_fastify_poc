exports.up = knex =>
  knex.schema.alterTable('currencies', table => {
    table.string('subunit_name').defaultTo('');
    table.string('subunit_name_ar').defaultTo('');
  });

exports.down = knex =>
  knex.schema.table('currencies', table => {
    table.dropColumn('subunit_name');
    table.dropColumn('subunit_name_ar');
  });
