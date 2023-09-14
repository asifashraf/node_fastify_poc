const { map } = require('lodash');
const { orderRatingAnswerType } = require('../order-rating-questions/enums');

module.exports = {
  Query: {
    async getLastNotRatedOrderWithQuestionByCustomer(
      root,
      { },
      context
    ) {
      const customerId = context.auth.id;
      return context.orderRating.getLastNotRatedOrderWithQuestionByCustomer(customerId);
    },
    async getQuestionsByOrderSetId(
      root,
      { orderSetId },
      context
    ) {

      return context.orderRating.getOrderDetail(orderSetId);
    },
    async getOrderRatingReportsByCountryId(
      root,
      {countryId, filters, paging},
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        return context.orderRating.getOrderRatingReportByCountryId(countryId, filters, paging);
      }
      return; // [attack_scope]
    },
  },
  Mutation: {
    async saveOrderRatingWithDetail(root, { ratingWithDetail }, context) {
      const customerId = context.auth.id;
      const errors = await context.orderRating.validateRatingWithDetails(ratingWithDetail, customerId);
      if (errors.length > 0) {
        return { errors, orderRating: null };
      }
      return context.orderRating.saveOrderRatingWithDetail(ratingWithDetail);
    }
  },
  answerTypes: {
    __resolveType: obj => {
      return obj.__typeOf;
    },
  },
  OrderRatingWithQuestions: {
    rateable({ orderSetId }, args, context) {
      return context.orderRating.isOrderRateableByOrderSetId(orderSetId);
    },
    orderRating({ orderSetId }, args, context) {
      return context.orderRating.loaders.byOrderSet.load(orderSetId);
    },
    async overallQuestion({ brandName, branchName, fulfillmentType, rateable }, args, context) {
      const questions = await context.orderRatingQuestion.getOverallQuestion({ rateable, fulfillmentType, sqlLimit: 1 });
      if (questions && questions.length > 0) {
        const question = questions[0];
        return {
          ...question,
          question: context.orderRatingQuestion.getReplacedString(question.question, brandName, branchName),
          description: context.orderRatingQuestion.getReplacedString(question.description, brandName, branchName),
          isRequired: true,
        };
      }
      return null;
    },
    async detailsQuestions({ brandName, branchName, fulfillmentType, rateable }, args, context) {
      if (rateable === true)
        return null;
      let questions = await context.orderRatingQuestion.getDetailQuestionsByFulFillmentType({ fulfillmentType });
      questions = map(questions, question => ({
        ...question,
        question: context.orderRatingQuestion.getReplacedString(question.question, brandName, branchName),
        description: context.orderRatingQuestion.getReplacedString(question.description, brandName, branchName),
        isRequired: false,
      }));
      return questions;
    },
  },
  OrderRatingQuestionWithAnswers: {
    answers({ isRequired }, args, context) {
      if (isRequired) {
        const a = [1, 2, 3, 4, 5];
        const answers = map(a, elem => ({ answer: elem, __typeOf: 'OverallAnswers' }));
        return answers;
      }
      const answers = map(orderRatingAnswerType, answerType => ({ detailsAnswer: answerType, __typeOf: 'DetailsAnswers' }));
      return answers;
    }
  }
};
