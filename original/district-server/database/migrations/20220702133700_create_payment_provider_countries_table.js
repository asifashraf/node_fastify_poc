exports.up = knex =>
  knex.schema.createTable('payment_provider_countries', table => {
    table
        .uuid('id')
        .primary()
        .notNullable();
    table
      .uuid('payment_provider_id')
      .references('id')
      .inTable('payment_providers')
      .index()
      .notNullable()
      .onDelete('CASCADE');
    table
      .string('status')
      .defaultTo('ACTIVE')
      .notNullable();
    table
      .boolean('is_apple_pay_enable')
      .defaultTo(false);
    table
      .boolean('is_google_pay_enable')
      .defaultTo(false);
    table
      .boolean('is_knet_enable')
      .defaultTo(false);
    table
      .boolean('is_visa_master_enable')
      .defaultTo(false);
    table
      .boolean('is_amex_enable')
      .defaultTo(false); 
    table
      .boolean('is_mada_enable')
      .defaultTo(false);   
    table
      .boolean('is_stc_enable')
      .defaultTo(false);
    table
      .boolean('is_card_saved_enable')
      .defaultTo(false);      
    table.unique(['payment_provider_id']);
  });

exports.down = knex => knex.schema.dropTable('payment_provider_countries');
