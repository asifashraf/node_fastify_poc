exports.up = knex =>
  knex.schema.table('partner_requests', table => {
    table.string('business_type');
    table.string('locations_count');
    table.string('instagram_account');
    table.string('fulfillment_services');
    table.boolean('coffee_key_feature');
    table.string('menu_url');
    table.boolean('terms_conditions');
    table.boolean('gdpr_guidelines');
  });

exports.down = knex =>
  knex.schema.table('partner_requests', table => {
    table.dropColumn('business_type');
    table.dropColumn('locations_count');
    table.dropColumn('instagram_account');
    table.dropColumn('fulfillment_services');
    table.dropColumn('coffee_key_feature');
    table.dropColumn('menu_url');
    table.dropColumn('terms_conditions');
    table.dropColumn('gdpr_guidelines');
  });
