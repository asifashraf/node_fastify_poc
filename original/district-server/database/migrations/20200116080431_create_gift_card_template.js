const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('gift_card_templates', table => {
      table.uuid('id').primary();
      table.string('name');
      table.string('name_ar');
      table.string('image_url');
      table.string('image_url_ar');
      table
        .uuid('gift_card_collection_id')
        .references('id')
        .inTable('gift_card_collections')
        .index()
        .notNullable();
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index()
        .notNullable();
      table
        .uuid('currency_id')
        .references('id')
        .inTable('currencies')
        .index();
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands')
        .index();
      table.timestamp('available_from');
      table.timestamp('available_until');
      table.string('time_zone_identifier');
      table.integer('purchased_count').notNullable();
      table.integer('redeemed_count').notNullable();
      table.string('status').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('gift_card_templates')));

exports.down = knex => knex.schema.dropTable('gift_card_templates');
