exports.up = async knex => {
  await knex.schema.table('new_brands', table => {
    table.index('brand_id', 'idx-new_brands-brand_id');
    table.index('order', 'idx-new_brands-order');
  });
};

exports.down = async knex => {
  await knex.schema.table('new_brands', table => {
    table.dropIndex('section_id', 'idx-new_brands-section_id');
    table.dropIndex('order', 'idx-new_brands-order');
  });
};
