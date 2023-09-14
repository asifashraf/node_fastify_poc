exports.up = knex =>
  knex.schema.createTable('golden_cofe_brands', table => {
    table.uuid('country_id');
    table.uuid('brand_id');
  });

exports.down = knex => knex.schema.dropTable('golden_cofe_brands');
