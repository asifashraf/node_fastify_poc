exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table.string('brand_description', 280);
    table.string('brand_description_ar', 280);
    table.string('brand_description_tr', 280);
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('brand_description');
    table.dropColumn('brand_description_ar');
    table.dropColumn('brand_description_tr');
  });
