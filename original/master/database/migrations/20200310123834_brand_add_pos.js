exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table.boolean('is_pos').default(false);
    table.string('pos_type');
    table.string('pos_id');
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('is_pos');
    table.dropColumn('pos_type');
    table.dropColumn('pos_id');
  });
