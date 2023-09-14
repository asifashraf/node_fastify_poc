const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  orderSetStatusNames,
  saveOrderRatingError,
  saveOrderRatingDetailError,
  orderSetStatusName,
  OrderRatingStatus, OrderRatingQuestionType,
} = require('../root/enums');
const { orderRatingWithDetailSaveError } = require('./enums');
const moment = require('moment');
const { first, map, concat, findIndex, find } = require('lodash');
const { addPaging, transformToCamelCase, addLocalizationField } = require('../../lib/util');
const {
  orderRatingSlackUrl
} = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');

class OrderRating extends BaseModel {
  constructor(db, context) {
    super(db, 'order_rating', context);
    this.loaders = createLoaders(this);
  }

  async validate(orderRating) {
    const errors = [];
    const overallQuestions = await this.context.orderRatingQuestion.getActiveOverallQuestions({ questionType: OrderRatingQuestionType.OVERALL });
    if (overallQuestions.length < 1) {
      errors.push(saveOrderRatingError.INVALID_OVERALL_QUESTION);
    }
    const overallFulfillmentQuestions = await this.context.orderRatingQuestion.getActiveOverallQuestions({ questionType: OrderRatingQuestionType.FULFILLMENT_OVERALL });
    if (overallFulfillmentQuestions.length < 1) {
      errors.push(saveOrderRatingError.INVALID_OVERALL_QUESTION);
    }
    const orderSet = await this.context.orderSet.getById(orderRating.orderSetId);
    if (orderSet) {
      if (moment.utc().diff(moment(orderSet.createdAt), 'days') > 15) {
        errors.push(saveOrderRatingDetailError.RATEABLE_TIME_OVER);
      }
      if (orderSet.currentStatus === orderSetStatusNames.COMPLETED) {
        const existing = await this.getOrderRatingByOrderSetId(
          orderRating.orderSetId
        );
        if (existing) {
          errors.push(saveOrderRatingError.ALREADY_RATED_ORDER);
        } else if (orderRating.rating > 5 || orderRating.rating < 1) {
          errors.push(saveOrderRatingError.INVALID_RATING);
        }
      } else {
        errors.push(saveOrderRatingError.ORDER_NOT_COMPLETED);
      }
    } else {
      errors.push(saveOrderRatingError.INVALID_ORDER_SET_ID);
    }
    return errors;
  }

  async validateDetail(orderRatingDetail, customerId) {
    const errors = [];
    const existing = await this.getById(orderRatingDetail.orderRatingId);
    if (existing) {
      if (existing.customerId !== customerId) {
        errors.push(saveOrderRatingDetailError.NOT_MATCHED_CUSTOMER);
      }
      const orderSet = await this.context.orderSet.getById(existing.orderSetId);
      if (orderSet && moment.utc().diff(moment(orderSet.createdAt), 'days') > 15) {
        errors.push(saveOrderRatingDetailError.RATEABLE_TIME_OVER);
      }
      if (orderRatingDetail.comment) {
        if (orderRatingDetail.comment.length > 280) {
          errors.push(saveOrderRatingDetailError.INVALID_COMMENT);
        }
      }
      if (orderRatingDetail.details) {
        await Promise.all(
          map(orderRatingDetail.details, async detail => {
            const question = await this.context.orderRatingQuestion.getById(
              detail.questionId
            );
            if (!question || question.status === 'INACTIVE') {
              errors.push(saveOrderRatingDetailError.INVALID_QUESTION);
            }
          })
        );
      }
    } else {
      errors.push(saveOrderRatingDetailError.INVALID_ORDER_RATING_ID);
    }
    return errors;
  }

  async validateRatingWithDetails(ratingWithDetail, customerId) {
    const errors = [];
    const overallQuestions = await this.context.orderRatingQuestion.getActiveOverallQuestions({ questionType: OrderRatingQuestionType.OVERALL });
    if (overallQuestions.length < 1) {
      errors.push(saveOrderRatingError.INVALID_OVERALL_QUESTION);
    }
    const overallFulfillmentQuestions = await this.context.orderRatingQuestion.getActiveOverallQuestions({ questionType: OrderRatingQuestionType.FULFILLMENT_OVERALL });
    if (overallFulfillmentQuestions.length < 1) {
      errors.push(saveOrderRatingError.INVALID_OVERALL_QUESTION);
    }
    const orderSet = await this.context.orderSet.getById(ratingWithDetail.orderSetId);
    if (!orderSet) {
      errors.push(orderRatingWithDetailSaveError.INVALID_ORDER_SET_ID);
    } else {
      if (orderSet && moment.utc().diff(moment(orderSet.createdAt), 'days') > 15) {
        errors.push(orderRatingWithDetailSaveError.RATEABLE_TIME_OVER);
      }
      if (orderSet.customerId !== customerId) {
        errors.push(orderRatingWithDetailSaveError.NOT_MATCHED_CUSTOMER);
      }
      if (orderSet.currentStatus !== orderSetStatusNames.COMPLETED) {
        errors.push(orderRatingWithDetailSaveError.ORDER_NOT_COMPLETED);
      } else {
        const existing = await this.getOrderRatingByOrderSetId(
          ratingWithDetail.orderSetId
        );
        const questionTypes = [OrderRatingQuestionType.OVERALL, OrderRatingQuestionType.FULFILLMENT_OVERALL, OrderRatingQuestionType.DETAIL];
        if (existing) {
          if (existing.details && questionTypes.every(questionType => existing.details.some(detail => detail.questionType === questionType))) {
            errors.push(orderRatingWithDetailSaveError.ALREADY_RATED_ORDER);
          }
        }
      }
    }
    if (ratingWithDetail.rating > 5 || ratingWithDetail.rating < 1) {
      errors.push(orderRatingWithDetailSaveError.INVALID_RATING);
    }
    if (ratingWithDetail.comment) {
      if (ratingWithDetail.comment.length > 280) {
        errors.push(orderRatingWithDetailSaveError.INVALID_COMMENT);
      }
    }
    if (ratingWithDetail.details) {
      await Promise.all(
        map(ratingWithDetail.details, async detail => {
          const question = await this.context.orderRatingQuestion.getById(
            detail.questionId
          );
          if (!question || question.status === 'INACTIVE') {
            errors.push(orderRatingWithDetailSaveError.INVALID_QUESTION);
          }
        })
      );
    }
    return errors;
  }

  async updateOrderDetails(orderRatingDetail) {
    const orderRating = await this.getById(orderRatingDetail.orderRatingId);
    const oldDetails = orderRating.details;
    const newDetails = [];
    await Promise.all(
      orderRatingDetail.details.map(async detail => {
        const question = await this.context.orderRatingQuestion.getById(
          detail.questionId
        );

        const index = findIndex(oldDetails, function (oD) {
          return oD.id === question.id;
        });
        if (index < 0) {
          newDetails.push({
            id: question.id,
            question: question.question,
            description: question.description,
            answer: detail.answer,
          });
        } else if (!question.overall) {
          oldDetails[index].answer = detail.answer;
        }
      })
    );
    orderRating.details = JSON.stringify(concat(oldDetails, newDetails));
    orderRating.comment = orderRatingDetail.comment;
    await this.save(orderRating);
    return this.getById(orderRatingDetail.orderRatingId);
  }

  async getOrderRatingByOrderSetId(orderSetId) {
    return (await this.getBy('order_set_id', orderSetId))[0];
  }

  getOrderRatingsByCustomerId(customerId) {
    return this.getBy('customer_id', customerId);
  }

  async getOrderRatings(brandLocationId, filters, paging) {
    const {
      totalScore,
      totalReviews,
      averageRating,
    } = await this.getBranchScore(brandLocationId);
    let items = [];
    if (totalReviews > 0) {
      items = this.getRatingList(brandLocationId, filters, paging);
    }
    return { totalScore, totalReviews, averageRating, items };
  }

  async getOrderRatingsWithFakeBranchScore(brandLocationId, filters, paging) {
    const {
      totalScore,
      totalReviews,
      averageRating,
    } = await this.getFakeBranchScore(brandLocationId);
    let items = [];
    if (totalReviews > 0) {
      items = this.getRatingList(brandLocationId, filters, paging);
    }
    return { totalScore, totalReviews, averageRating, items };
  }

  async getBranchScore(brandLocationId) {
    const resp = { totalScore: 0, totalReviews: 0, averageRating: null };
    const branchScore = await this.roDb('brand_location_score')
      .where('brand_location_id', brandLocationId)
      .then(transformToCamelCase)
      .then(first);
    if (branchScore) {
      resp.totalScore = branchScore.totalScore;
      resp.totalReviews = branchScore.totalReviews;
      resp.averageRating = resp.totalScore / resp.totalReviews;
    }
    return resp;
  }

  async getBranchScoreWithFulfillment(brandLocationId) {
    const emptyValue = { totalScore: 0, totalReviews: 0, averageRating: null };
    const branchScores = await this.roDb('brand_location_score_fulfillment')
      .where('brand_location_id', brandLocationId)
      .then(transformToCamelCase);
    const resp = [];
    const fulfillmentTypes = ['PICKUP', 'CAR', 'DELIVERY', 'EXPRESS_DELIVERY'];
    fulfillmentTypes.map(fulfillment => {
      if (branchScores && branchScores.length > 0 && findIndex(branchScores, branchScore => branchScore.fulfillmentType === fulfillment) > -1) {
        const branchScore = find(branchScores, branchScore => branchScore.fulfillmentType === fulfillment);
        resp.push({
          totalScore: branchScore.totalScore,
          totalReviews: branchScore.totalReviews,
          averageRating: branchScore.totalScore / branchScore.totalReviews,
          fulfillment
        });
      } else {
        resp.push({ ...emptyValue, fulfillment });
      }
    });
    return resp;
  }

  async getBrandScore(brandId) {
    const resp = { totalScore: 0, totalReviews: 0, averageRating: null };
    const branchScores = await this.roDb('brand_location_score as bls')
      .select('bls.*')
      .leftJoin('brand_locations as bl', 'bl.id', 'bls.brand_location_id')
      .where('bl.brand_id', brandId)
      .then(transformToCamelCase);
    if (branchScores.length > 0) {
      map(branchScores, score => {
        resp.totalScore += score.totalScore;
        resp.totalReviews += score.totalReviews;
      });
      resp.averageRating = resp.totalScore / resp.totalReviews;
    }
    return resp;
  }

  async getFakeBranchScore(brandLocationId) {
    let { totalScore, totalReviews, averageRating } = await this.getBranchScore(
      brandLocationId
    );
    if (totalReviews > 0) {
      if (averageRating < 3) {
        const x = parseInt((3 * totalReviews - totalScore) / 2, 10) + 1;
        totalScore += x * 5;
        totalReviews += x;
        averageRating = totalScore / totalReviews;
      }
    }
    return { totalScore, totalReviews, averageRating };
  }

  getRatingList(brandLocationId, filters, paging) {
    const between = [
      filters.minRating
        ? filters.minRating > 5 || filters.minRating < 1
          ? 1
          : filters.minRating
        : 1,
      filters.maxRating
        ? filters.maxRating > 5 || filters.maxRating < 1
          ? 5
          : filters.maxRating
        : 5,
    ];
    let query = super.getAll();
    query = query
      .select('comment', 'rating', 'customer_name', 'fulfillment_type')
      .where('brand_location_id', brandLocationId)
      .andWhereBetween('rating', between)
      .orderBy('created_at', 'desc');
    return addPaging(query, paging);
  }

  async getLastNotRatedOrderWithQuestionByCustomer(customerId) {
    const startDate = moment(moment.utc()).subtract(15, 'day');
    const orderSet = await this.db('view_orders')
      .join('order_sets', 'order_sets.id', 'view_orders.id')
      .select('view_orders.id', 'view_orders.brand_id', 'view_orders.brand_location_id', 'view_orders.fulfillment_type', 'order_sets.rating_status')
      .where('view_orders.customer_id', customerId)
      .andWhere('view_orders.current_status', orderSetStatusName.COMPLETED)
      .andWhere('view_orders.created_at', '>=', startDate)
      .orderBy('view_orders.created_at', 'desc')
      .first();
    if (orderSet == null || (orderSet && orderSet.ratingStatus !== OrderRatingStatus.PENDING)) {
      return null;
    }
    const { id, brandId, brandLocationId, fulfillmentType } = orderSet;
    const { brandName, branchName } = await this.getBrandAndBranchName(brandId, brandLocationId);
    // to avoid displaying the same order again
    await this.context.orderSet.save({ id, ratingStatus: OrderRatingStatus.SKIPPED });
    return { orderSetId: id, rateable: true, fulfillmentType, branchName, brandName };
  }

  async getBrandAndBranchName(brandId, branchId) {
    const brandLocation = addLocalizationField(await this.context.brandLocation.getById(branchId), 'name');
    const branchName = brandLocation.name;
    const brand = addLocalizationField(await this.context.brand.getById(brandId ? brandId : brandLocation.brandId), 'name');
    const brandName = brand.name;
    return { brandName, branchName };
  }

  async getOrderDetail(orderSetId) {
    const orderSet = await this.db('view_orders')
      .select('view_orders.id', 'view_orders.brand_id', 'view_orders.brand_location_id', 'view_orders.fulfillment_type')
      .andWhere('view_orders.id', orderSetId)
      .first();
    if (!orderSet) {
      return null;
    }
    const { brandId, brandLocationId, fulfillmentType } = orderSet;
    const { brandName, branchName } = await this.getBrandAndBranchName(brandId, brandLocationId);
    return { orderSetId, fulfillmentType, branchName, brandName };
  }

  async isOrderRateableByOrderSetId(orderSetId) {
    const orderSet = await this.context.orderSet.getById(orderSetId);
    if (orderSet.currentStatus !== orderSetStatusNames.COMPLETED || orderSet.ratingStatus == OrderRatingStatus.UNAVAILABLE || orderSet.ratingStatus === OrderRatingStatus.RATED) {
      return false;
    } else if (moment.utc().diff(moment(orderSet.createdAt), 'days') > 15) {
      return false;
    } else {
      return true;
    }
  }

  async saveOrderRatingWithDetail(ratingWithDetail) {
    const [orderFulfillment, orderSet, orderRating] = await Promise.all([
      this.context.orderFulfillment.getByOrderSet(ratingWithDetail.orderSetId),
      this.context.orderSet.getById(ratingWithDetail.orderSetId),
      this.context.orderRating.getOrderRatingByOrderSetId(ratingWithDetail.orderSetId),
    ]);

    if (orderRating && orderRating.id) {
      ratingWithDetail.id = orderRating.id;
    }

    const [customer, brandBranchNames, overallFulfillmentQuestions] = await Promise.all([
      this.context.customer.getById(orderSet.customerId),
      this.context.orderRating.getBrandAndBranchName(null, orderSet.brandLocationId),
      this.context.orderRatingQuestion.getOverallQuestion({
        rateable: false,
        fulfillmentType: orderFulfillment.type,
        sqlLimit: 1,
      }),
    ]);
    const { brandName, branchName } = brandBranchNames;

    ratingWithDetail.brandLocationId = orderSet.brandLocationId;
    ratingWithDetail.customerId = orderSet.customerId;
    ratingWithDetail.customerName = customer.firstName;
    ratingWithDetail.fulfillmentType = orderFulfillment.type;

    let details = [];

    // OVERALL DETAILS
    if (orderRating && orderRating.details) {
      details = details.concat(orderRating.details);
    }

    const overallFulfillmentDetail = {
      id: overallFulfillmentQuestions[0].id,
      question: this.context.orderRatingQuestion.getReplacedString(overallFulfillmentQuestions[0].question, brandName, branchName),
      description: this.context.orderRatingQuestion.getReplacedString(overallFulfillmentQuestions[0].description, brandName, branchName),
      answer: ratingWithDetail.rating,
      questionType: OrderRatingQuestionType.FULFILLMENT_OVERALL,
    };

    // OVERALL FULFILLMENT DETAILS
    if (overallFulfillmentDetail)
      details.push(overallFulfillmentDetail);

    // OTHER DETAILS
    let mappedDetails = [];
    mappedDetails = await Promise.all(ratingWithDetail.details.map(async detail => {
      const question = await this.context.orderRatingQuestion.getById(
        detail.questionId,
      );
      if (!question) return null;
      const index = findIndex(details, t => t.id == question.id);
      if (index < 0) {
        const obj = {
          id: question.id,
          question: this.context.orderRatingQuestion.getReplacedString(question.question, brandName, branchName),
          description: this.context.orderRatingQuestion.getReplacedString(question.description, brandName, branchName),
          answer: detail.answer,
          questionType: OrderRatingQuestionType.DETAIL,
        };
        return obj;
      } return null;
    })
    );
    mappedDetails = mappedDetails.filter(n => n);

    if (ratingWithDetail.details && ratingWithDetail.details.length > 0
      && mappedDetails && mappedDetails.length > 0) {
      details = details.concat(mappedDetails);
    }

    if (ratingWithDetail.rating <= 2) {
      this.sendMessagesToSlack(ratingWithDetail.orderSetId, details, ratingWithDetail.comment);
    }

    ratingWithDetail.details = JSON.stringify(details);
    const id = await this.save(ratingWithDetail);

    await this.context.orderSet.save({ id: ratingWithDetail.orderSetId, ratingStatus: OrderRatingStatus.RATED });
    return { orderRating: this.getById(id), errors: null };
  }

  async getOrderRatingReportByCountryId(countryId, filters, paging) {
    const select = `b.id as brand_id, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr,
    bl.name as brand_location_name, bl.name_ar as brand_location_name_ar, bl.name_tr as brand_location_name_tr,
    os.short_code, orr.*`;
    const query = this.roDb('order_rating as orr')
      .leftJoin('order_sets as os', 'os.id', 'orr.order_set_id')
      .leftJoin('brand_locations as bl', 'bl.id', 'orr.brand_location_id')
      .leftJoin('brands as b', 'b.id', 'bl.brand_id')
      .where('b.country_id', countryId);

    if (filters?.brandId) {
      query.where('bl.brand_id', filters.brandId);
    }
    if (filters?.brandLocationId) {
      query.where('orr.brand_location_id', filters.brandLocationId);
    }
    if (filters?.fulfillmentType) {
      query.where('orr.fulfillment_type', filters.fulfillmentType);
    }
    if (filters?.ratings && Array.isArray(filters.ratings) && filters.ratings.length > 0) {
      query.whereIn('orr.rating', filters.ratings);
    }
    const totalCount = (await query.clone().count())[0].count;
    query.select(this.roDb.raw(select))
      .orderBy('orr.created_at', 'desc');
    const page = paging?.page || 1;
    const limit = paging?.limit || 10;
    query.offset((page - 1) * limit).limit(limit);
    const ratings = addLocalizationField(
      addLocalizationField(await query, 'brandLocationName'),
      'brandName'
    );
    return {
      pagination: {
        totalRecords: +totalCount,
        totalPage: (~~(totalCount / limit) + (totalCount % limit === 0 ? 0 : 1)),
        page: totalCount == 0 ? 0 : page,
        limit
      },
      ratings
    };
  }

  async sendMessagesToSlack(orderId, details, comment) {
    if (!details || !orderId) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          errorReason: 'Order set id or details are missing',
        },
        kinesisEventTypes.slackMessageError
      );
      return null;
    }
    const orderSet = await this.context.orderSet.getById(orderId);
    if (!orderSet) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          errorReason: 'Order set is not found!! id: ' + orderId,
        },
        kinesisEventTypes.slackMessageError
      );
      return null;
    }
    const country = await this.context.country.getByCurrencyId(orderSet.currencyId);
    if (!country) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          errorReason: 'Country is not found!! currency id: ' + orderSet.currencyId,
        },
        kinesisEventTypes.slackMessageError
      );
      return null;
    }
    const customer = await this.context.customer.getById(orderSet.customerId);
    if (!customer) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          errorReason: 'Customer is not found!! customer id: ' + orderSet.customerId,
        },
        kinesisEventTypes.slackMessageError
      );
      return null;
    }
    const brand = await this.db('brand_locations as bl')
      .select('b.id as brandId', 'b.name as brandName', 'b.country_id', 'bl.name as branchName', 'bl.id as branchId')
      .leftJoin('brands as b', 'b.id', 'bl.brand_id')
      .where('bl.id', orderSet.brandLocationId).first();
    let detailString = '';
    for (const question of details) {
      detailString += `
Question: ${question.question.en}
Answer: ${question.answer}
      `;
    }
    detailString = detailString.trim();
    const slackUrl = orderRatingSlackUrl[country.isoCode].url;
    const adminPortal = orderRatingSlackUrl.adminPortal.baseUrl;
    const orderPage = `${adminPortal}/${orderRatingSlackUrl.adminPortal.ordersPage}/${orderSet.id}`;
    const customerPage = `${adminPortal}/${orderRatingSlackUrl.adminPortal.customersPage}/${orderSet.customerId}`;
    const customerInformation = `${customer?.firstName} ${customer?.lastName} (Email: ${customer?.email} | Phone: ${customer?.phoneNumber})`;
    SlackWebHookManager.sendTextToSlack(
      `[!!! Low Order Rating Detected (<=2) !!!]
Order Url: ${orderPage}
Brand Name: ${brand.brandName}
Branch Name: ${brand.branchName}
Customer: ${customerInformation}
Customer Url: ${customerPage}
${comment ? 'Comment: ' + comment + '\n' : ''}
${detailString}`, slackUrl);
  }
}

module.exports = OrderRating;
