exports.up = function (knex) {
  return knex.schema.createTable('cofelytics_offers', table => {
    table.uuid('id').primary();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table.string('target_type').notNullable(); 
    table.specificType('average_amount', 'numeric(13, 3)').notNullable();
    table.uuid('currency_id').references('id').inTable('currencies').index();
    table.integer('customer_count').notNullable();
    table.string('offer').notNullable();
    table.timestamp('start_date').notNullable();
    table.integer('offer_duration').notNullable();
    table.boolean('all_branch').notNullable();
    table.boolean('sms').defaultTo(false);
    table.jsonb('sms_info');
    table.boolean('email').defaultTo(false);
    table.jsonb('email_info');
    table.boolean('push').defaultTo(false);
    table.jsonb('push_info');
    table.specificType('images', 'text ARRAY');
    table.string('customers_csv_url');
    table.string('branchs_csv_url');  
    table.jsonb('request_data').notNullable();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('cofelytics_offers');
};