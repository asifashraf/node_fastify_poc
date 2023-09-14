const { onUpdateTrigger } = require('../../knexfile');
const uuid = require('uuid');

exports.up = async function(knex) {
  await knex('permissions').insert({
    id: uuid.v4(),
    name: 'filterSets:upsert',
    description: 'Filter Set Edit/Create Permission',
  });

  return knex.schema.createTable('filter_sets', table => {
    table.uuid('id').primary();

    table.string('title').notNullable();
    table.string('title_ar').notNullable().defaultTo('');
    table.string('title_tr').notNullable().defaultTo('');

    table.string('analytics_event_name').notNullable().defaultTo('');
    table.boolean('is_searchable').notNullable().defaultTo(true);

    table.string('empty_data_icon').notNullable();
    table.string('empty_data_icon_ar').notNullable().defaultTo('');
    table.string('empty_data_icon_tr').notNullable().defaultTo('');

    table.string('empty_data_title').notNullable();
    table.string('empty_data_title_ar').notNullable().defaultTo('');
    table.string('empty_data_title_tr').notNullable().defaultTo('');

    table.string('empty_data_description').notNullable();
    table.string('empty_data_description_ar').notNullable().defaultTo('');
    table.string('empty_data_description_tr').notNullable().defaultTo('');

    table.string('empty_data_button_title').notNullable();
    table.string('empty_data_button_title_ar').notNullable().defaultTo('');
    table.string('empty_data_button_title_tr').notNullable().defaultTo('');

    table.string('empty_data_deeplink').notNullable();
    table.string('empty_data_deeplink_ar').notNullable().defaultTo('');
    table.string('empty_data_deeplink_tr').notNullable().defaultTo('');

    table.jsonb('fulfillment_types').nullable();
    table.jsonb('brand_ids').nullable();
    table.jsonb('tag_ids').nullable();

    table.timestamp('created').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated').notNullable().defaultTo(knex.fn.now());
  }).then(() => knex.raw(onUpdateTrigger('filter_sets')));
};

exports.down = async function(knex) {
  await knex.schema.dropTable('filter_sets');
};
