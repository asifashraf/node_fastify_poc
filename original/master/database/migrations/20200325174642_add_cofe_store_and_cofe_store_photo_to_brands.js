exports.up = knex =>
  knex.schema.table('brands', table => {
    table.boolean('cofe_store').default(false);
    table.string('cofe_store_photo');
  });

exports.down = knex =>
  knex.schema.alterTable('brands', table => {
    table.dropColumn('cofe_store');
    table.dropColumn('cofe_store_photo');
  });
