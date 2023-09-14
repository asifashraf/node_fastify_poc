exports.up = function (knex) {
    return knex.schema.raw(
      `ALTER TYPE home_page_section_item_type_enum ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM';
       ALTER TYPE home_page_section_item_type_enum ADD VALUE IF NOT EXISTS 'BRAND_HORIZONTAL_CARD_LIST_ITEM';
       ALTER TYPE home_page_section_item_type_enum ADD VALUE IF NOT EXISTS 'BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM'
       ALTER TYPE home_page_section_item_type_enum ADD VALUE IF NOT EXISTS 'EXPRESS_DELIVERY_HORIZONTAL_CARD_LIST_ITEM';`
    )
  }
  
  exports.down = async function (knex) {
  };