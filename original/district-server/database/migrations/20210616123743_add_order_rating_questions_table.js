const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema.createTable('order_rating_questions', table => {
    table.uuid('id').primary();
    table.string('question', 140).notNullable();
    table.string('description', 140);
    table.string('status').default('ACTIVE');
    table.boolean('pickup').default(false);
    table.boolean('car_window').default(false);
    table.boolean('delivery').default(false);
    table.boolean('express_delivery').default(false);
    table.boolean('overall').default(false);
    table.string('question_tr', 140);
    table.string('question_ar', 140);
    table.string('description_tr', 140);
    table.string('description_ar', 140);
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
  })
    .then(() => knex.raw(onUpdateTrigger('order_rating_questions')));

exports.down = knex => knex.schema.dropTable('order_rating_questions');
