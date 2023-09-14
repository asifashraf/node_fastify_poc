exports.up = knex =>
  knex.schema.alterTable('rewards', table => {
    table.string('conversion_name');
    table.string('conversion_name_ar');
  });

exports.down = knex =>
  knex.schema.table('rewards', table => {
    table.dropColumn('conversion_name');
    table.dropColumn('conversion_name_ar');
  });
