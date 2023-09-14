exports.up = function (knex) {
  return knex.schema.createTable('tag_relations', table => {
    table.uuid('id').primary().notNullable();
    table.uuid('tag_id').references('id').inTable('tags').index().notNullable();
    table.uuid('rel_id').index().notNullable();
    table.unique(['tag_id', 'rel_id']);
    table.enu('rel_type', ['MENU_ITEM', 'BRAND_LOCATION'], {
      useNative: true,
      enumName: 'tag_relation_type_enum',
    }).notNullable();
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('tag_relations');
};
