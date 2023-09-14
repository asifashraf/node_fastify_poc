const { OrderRatingQuestionType } = require('../../src/schema/root/enums');

exports.up = function (knex) {
  return knex.schema.alterTable('order_rating_questions', tableBuilder => {
    tableBuilder.dropColumn('overall');
    tableBuilder.enu('question_type', Object.values(OrderRatingQuestionType), {
      useNative: true,
      enumName: 'order_rating_question_type_enum',
    }).nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('order_rating_questions', tableBuilder => {
    tableBuilder.dropColumn('question_type');
    tableBuilder.boolean('overall').default(false);
  });
};
