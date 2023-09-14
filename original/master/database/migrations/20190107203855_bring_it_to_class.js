exports.up = knex =>
  knex.schema.table('brand_locations', table =>
    table.boolean('bring_it_to_class').default(false)
  );

exports.down = knex =>
  knex.schema.table('brand_locations', table =>
    table.dropColumn('bring_it_to_class')
  );
