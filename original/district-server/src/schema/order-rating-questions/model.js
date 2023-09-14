const BaseModel = require('../../base-model');
const { addLocalizationField } = require('../../lib/util');
const { OrderRatingQuestionSaveError, OrderRatingQuestionType } = require('../root/enums');
const { orderFulfillmentTypes } = require('../order-set/enums');

class OrderRatingQuestion extends BaseModel {
  constructor(db, context) {
    super(db, 'order_rating_questions', context);
  }

  async getByFulfillmentType({questionType, fulfillmentType, sqlLimit}) {
    const filters = { 'question_type': questionType ? questionType : OrderRatingQuestionType.DETAIL };
    filters[this.getFulFillmentCondition(fulfillmentType)] = true;
    return this.getByFilters(filters, sqlLimit);
  }

  async getOverallQuestion({ rateable, fulfillmentType, sqlLimit }) {
    if (rateable) {
      const filters = { 'question_type': OrderRatingQuestionType.OVERALL };
      return this.getByFilters(filters, sqlLimit);
    } else if (fulfillmentType) {
      const filters = { 'question_type': OrderRatingQuestionType.FULFILLMENT_OVERALL };
      filters[this.getFulFillmentCondition(fulfillmentType)] = true;
      return this.getByFilters(filters, sqlLimit);
    }
  }

  async getDetailQuestionsByFulFillmentType({ fulfillmentType, sqlLimit }) {
    if (fulfillmentType) {
      const filters = { 'question_type': OrderRatingQuestionType.DETAIL };
      filters[this.getFulFillmentCondition(fulfillmentType)] = true;
      return this.getByFilters(filters, sqlLimit);
    }
  }

  async getActiveOverallQuestions({ questionType }) {
    const filters = { 'question_type': questionType };
    return this.getByFilters(filters);
  }

  async getByFilters(filters, sqlLimit) {
    let query = this.db(this.tableName)
      .where(filters)
      .orderBy('created', 'desc');
    if (!filters?.status) {
      query.where('status', 'ACTIVE');
    }
    if (sqlLimit) {
      query = query.limit(sqlLimit);
    }
    const question = await this.context.sqlCache(query);
    return addLocalizationField(
      addLocalizationField(question, 'question'),
      'description'
    );
  }

  async getById(id) {
    const question = await super.getById(id);
    return addLocalizationField(
      addLocalizationField(question, 'description'),
      'question'
    );
  }

  async getAll() {
    const query = super.getAll();
    const question = await this.context.sqlCache(query);
    return addLocalizationField(
      addLocalizationField(question, 'description'),
      'question'
    );
  }

  async validate(question) {
    const errors = [];

    const overallTypes = [OrderRatingQuestionType.OVERALL];

    // if try to update question
    if (question.id) {
      const result = await this.getById(question.id);
      if (!result) {
        errors.push(OrderRatingQuestionSaveError.INVALID_QUESTION);
      }
    }

    // length of question and description must be smaller than 140
    if (question.question.length > 140) {
      errors.push(OrderRatingQuestionSaveError.MAX_LENGTH_EXCEEDED);
    }
    if (question.questionTr && question.questionTr.length > 140) {
      errors.push(OrderRatingQuestionSaveError.MAX_LENGTH_EXCEEDED);
    }
    if (question.questionAr && question.questionAr.length > 140) {
      errors.push(OrderRatingQuestionSaveError.MAX_LENGTH_EXCEEDED);
    }
    if (question.description && question.description.length > 140) {
      errors.push(OrderRatingQuestionSaveError.MAX_LENGTH_EXCEEDED);
    }
    if (question.descriptionAr && question.descriptionAr.length > 140) {
      errors.push(OrderRatingQuestionSaveError.MAX_LENGTH_EXCEEDED);
    }
    if (question.descriptionTr && question.descriptionTr.length > 140) {
      errors.push(OrderRatingQuestionSaveError.MAX_LENGTH_EXCEEDED);
    }
    // a question cannot be saved without type
    if (
      !question.pickup &&
      !question.carWindow &&
      !question.delivery &&
      !question.expressDelivery &&
      !question.questionType
    ) {
      errors.push(OrderRatingQuestionSaveError.TYPE_REQUIRED);
    }

    if (
      question.questionType === OrderRatingQuestionType.OVERALL &&
      (question.pickup ||
        question.carWindow ||
        question.delivery ||
        question.expressDelivery)
    ) {
      errors.push(OrderRatingQuestionSaveError.ONLY_OVERALL_TYPE_ALLOWED);
    }

    if (
      question.questionType === OrderRatingQuestionType.FULFILLMENT_OVERALL &&
      !(question.pickup ||
        question.carWindow ||
        question.delivery ||
        question.expressDelivery)
    ) {
      errors.push(OrderRatingQuestionSaveError.FULFILLMENT_MISSING);
    }

    // if (
    //   question.questionType === OrderRatingQuestionType.DETAIL &&
    //   !(question.pickup ||
    //     question.carWindow ||
    //     question.delivery ||
    //     question.expressDelivery)
    // ) {
    //   errors.push(OrderRatingQuestionSaveError.FULFILLMENT_MISSING);
    // }
    // overall question must have description
    if (overallTypes.some(t => t === question.questionType) && !question.description) {
      errors.push(OrderRatingQuestionSaveError.DESCRIPTION_MISSING);
    }

    if (errors.length === 0
      && overallTypes.some(t => t === question.questionType)
      && question.status
      && question.status === 'ACTIVE') {
      // to protect duplicate questions
      const setQuestionStatus = async (questionType, status) => {
        const questions = await this.getActiveOverallQuestions({ questionType });
        await Promise.all(questions.map(async (question) => {
          question.status = status;
          super.save(question);
        }));
      };

      // if try to add overall question, then status of other overall questions must be INACTIVE
      await setQuestionStatus(question.questionType, 'INACTIVE');
    }

    return errors;
  }

  getFulFillmentCondition(fulfillmentType) {
    switch (fulfillmentType) {
      case orderFulfillmentTypes.PICKUP:
        return 'pickup';
      case orderFulfillmentTypes.DELIVERY:
        return 'delivery';
      case orderFulfillmentTypes.CAR:
        return 'car_window';
      case orderFulfillmentTypes.EXPRESS_DELIVERY:
        return 'express_delivery';
      default:
        break;
    }
  }

  getReplacedString(localizedObj, brandName, branchName) {
    const langsX = ['en', 'ar', 'tr'];
    const localizeStr = (val) => {
      if (localizedObj[val]) {
        const brandNameX = brandName[val] ? brandName[val] : null;
        const branchNameX = branchName[val] ? branchName[val] : null;
        if (brandNameX) {
          localizedObj[val] = localizedObj[val].replace(/#brand/, brandNameX);
        }
        if (branchNameX) {
          localizedObj[val] = localizedObj[val].replace(/#branch/, branchNameX);
        }
      }
    };
    if (localizedObj && brandName && branchName) {
      langsX.map(t => localizeStr(t));
    }
    return localizedObj;
  }
}

module.exports = OrderRatingQuestion;
