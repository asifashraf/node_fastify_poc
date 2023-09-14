exports.up = knex => {
  const upPromises = [];
  upPromises.push(knex.schema.table('banners', table => {
    table
      .string('image_url_tr');
  }));
  upPromises.push(knex.schema.table('brand_location_addresses', table => {
    table
      .string('short_address_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('brand_locations', table => {
    table
      .string('name_tr')
      .default('')
  }));
  upPromises.push(knex.schema.table('brands', table => {
    table
      .string('name_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('categories', table => {
    table
      .string('name_tr')
  }));
  upPromises.push(knex.schema.table('cities', table => {
    table
      .string('name_tr');
  }));
  upPromises.push(knex.schema.table('countries', table => {
    table
      .string('name_tr');
  }));
  upPromises.push(knex.schema.table('currencies', table => {
    table
      .string('subunit_name_tr')
      .default('')
    table
      .string('symbol_tr')
  }));
  upPromises.push(knex.schema.table('customer_addresses_fields', table => {
    table
      .string('title_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('gift_card_collections', table => {
    table
      .string('name_tr');
  }));
  upPromises.push(knex.schema.table('gift_card_templates', table => {
    table
      .string('name_tr');
    table
      .string('image_url_tr');
  }));
  upPromises.push(knex.schema.table('gift_cards', table => {
    table
      .string('name_tr');
    table
      .string('image_url_tr');
  }));
  upPromises.push(knex.schema.table('golden_cofe_terms', table => {
    table
      .string('term_tr');
    table
      .string('image_url_tr');
  }));
  upPromises.push(knex.schema.table('menu_item_option_sets', table => {
    table
      .string('label_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('menu_item_options', table => {
    table
      .string('value_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('menu_items', table => {
    table
      .string('name_tr')
      .default('')
      .notNullable();
    table
      .string('item_description_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('menu_sections', table => {
    table
      .string('name_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('neighborhoods', table => {
    table
      .string('name_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('order_item_options', table => {
    table
      .string('value_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('order_items', table => {
    table
      .string('name_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('products', table => {
    table
      .string('name_tr');
    table
      .string('description_tr');
  }));
  upPromises.push(knex.schema.table('return_policies', table => {
    table
      .string('description_tr');
  }));
  upPromises.push(knex.schema.table('reward_tier_perks', table => {
    table
      .string('title_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('reward_tiers', table => {
    table
      .string('title_tr')
      .default('')
      .notNullable();
  }));
  upPromises.push(knex.schema.table('rewards', table => {
    table
      .string('title_tr')
      .default('')
      .notNullable();
    table
      .string('conversion_name_tr');
  }));
  upPromises.push(knex.schema.table('store_headers', table => {
    table
      .string('image_tr')
  }));
  upPromises.push(knex.schema.table('store_order_products', table => {
    table
      .string('name_tr')
  }));
  return Promise.all(upPromises);
}


exports.down = knex => {
  const downPromises = [];
  downPromises.push(knex.schema.table('banners', table => {
    table.dropColumn('image_url_tr');
  }));
  downPromises.push(knex.schema.table('brand_location_addresses', table => {
    table.dropColumn('short_address_tr');
  }));
  downPromises.push(knex.schema.table('brand_locations', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('brands', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('categories', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('cities', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('countries', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('currencies', table => {
    table.dropColumn('subunit_name_tr');
    table.dropColumn('symbol_tr');
  }));
  downPromises.push(knex.schema.table('customer_addresses_fields', table => {
    table.dropColumn('title_tr');
  }));
  downPromises.push(knex.schema.table('gift_card_collections', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('gift_card_templates', table => {
    table.dropColumn('name_tr');
    table.dropColumn('image_url_tr');
  }));
  downPromises.push(knex.schema.table('gift_cards', table => {
    table.dropColumn('name_tr');
    table.dropColumn('image_url_tr');
  }));
  downPromises.push(knex.schema.table('golden_cofe_terms', table => {
    table.dropColumn('term_tr');
    table.dropColumn('image_url_tr');
  }));
  downPromises.push(knex.schema.table('menu_item_option_sets', table => {
    table.dropColumn('label_tr');
  }));
  downPromises.push(knex.schema.table('menu_item_options', table => {
    table.dropColumn('value_tr');
  }));
  downPromises.push(knex.schema.table('menu_items', table => {
    table.dropColumn('name_tr');
    table.dropColumn('item_description_tr');
  }));
  downPromises.push(knex.schema.table('menu_sections', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('neighborhoods', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('order_item_options', table => {
    table.dropColumn('value_tr');
  }));
  downPromises.push(knex.schema.table('order_items', table => {
    table.dropColumn('name_tr');
  }));
  downPromises.push(knex.schema.table('products', table => {
    table.dropColumn('name_tr');
    table.dropColumn('description_tr');
  }));
  downPromises.push(knex.schema.table('return_policies', table => {
    table.dropColumn('description_tr');
  }));
  downPromises.push(knex.schema.table('reward_tier_perks', table => {
    table.dropColumn('title_tr');
  }));
  downPromises.push(knex.schema.table('reward_tiers', table => {
    table.dropColumn('title_tr');
  }));
  downPromises.push(knex.schema.table('rewards', table => {
    table.dropColumn('title_tr');
    table.dropColumn('conversion_name_tr');
  }));
  downPromises.push(knex.schema.table('store_headers', table => {
    table.dropColumn('image_tr');
  }));
  downPromises.push(knex.schema.table('store_order_products', table => {
    table.dropColumn('name_tr');
  }));
  return Promise.all(downPromises);
}

