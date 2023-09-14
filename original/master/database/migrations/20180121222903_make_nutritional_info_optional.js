exports.up = knex =>
  knex.schema
    .alterTable('menu_items', table => {
      table.dropForeign('base_nutritional_id');
    })
    .alterTable('nutritional_info_allergens', table => {
      table.dropForeign('nutritional_info_id');
      table
        .foreign('nutritional_info_id')
        .references('id')
        .inTable('nutritional_info')
        .onDelete('CASCADE');
    })
    .raw(
      `ALTER TABLE menu_items ALTER COLUMN base_nutritional_id DROP NOT NULL;`
    )
    .raw(
      `ALTER TABLE menu_items ADD CONSTRAINT menu_items_base_nutritional_id_foreign FOREIGN KEY (base_nutritional_id) REFERENCES nutritional_info(id) ON DELETE SET NULL;`
    );

exports.down = knex =>
  knex.schema
    .alterTable('menu_items', table => {
      table.dropForeign('base_nutritional_id');
      table
        .foreign('base_nutritional_id')
        .references('id')
        .inTable('nutritional_info')
        .onDelete('CASCADE');
    })
    .alterTable('nutritional_info_allergens', table => {
      table.dropForeign('nutritional_info_id');
      table
        .foreign('nutritional_info_id')
        .references('id')
        .inTable('nutritional_info');
    });
