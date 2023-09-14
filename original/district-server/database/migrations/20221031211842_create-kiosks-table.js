exports.up = function (knex) {
  return knex.schema.createTable('kiosks', table => {
    table.uuid('id').primary().notNullable();
    table.uuid('country_id')
      .references('id')
      .inTable('countries')
      .notNullable();
    table.uuid('brand_id')
      .references('id')
      .inTable('brands')
      .notNullable();
    table.uuid('brand_location_id')
      .references('id')
      .inTable('brand_locations')
      .index()
      .notNullable();
    table.enu('status', ['PAIRED', 'UNPAIRED', 'INACTIVE'], {
      useNative: true,
      enumName: 'kiosk_status_enum',
    }).defaultTo('UNPAIRED');
    table.string('device_name', 128);
    table.string('pair_code', 32);
    table.enu('menu_reference_type', ['MENU', 'SECTION', 'ITEM'], {
      useNative: true,
      enumName: 'kiosk_menu_reference_type_enum',
    }).defaultTo('MENU');
    table.uuid('menu_reference_id');
    table.jsonb('marketing_materials');
    table.timestamps(false, true);
    table.unique(['pair_code']);
  });
};

exports.down = async function (knex) {
  return knex.schema.dropTable('kiosks');
};
