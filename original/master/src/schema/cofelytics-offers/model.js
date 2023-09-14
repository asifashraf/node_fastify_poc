const BaseModel = require('../../base-model');
const {
  TargetCustomerGroupError,
  cofelyticsRequestStatus
} = require('./enums');
const moment = require('moment');
const CurrencyValue = require('../../lib/currency');
const {map, template} = require('lodash');
const fs = require('fs');
const path = require('path');
const {
  cofelytics: {
    senderEmail,
    receiverEmail
  }
} = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const { generateCustomersCSVFile, generateBranchesCSVFile, generateBranchesCSVFileByBrandId } = require('./csv-utils');
const {
  notificationMedia,
  notificationProviders,
} = require('../../notifications/enums');
const { uuid, addLocalizationField} = require('../../lib/util');
moment.suppressDeprecationWarnings = true;
const DATE_FORMAT = 'MM.DD.YYYY';
const regex = /https:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

class CofelyticsOffers extends BaseModel {
  constructor(db, context) {
    super(db, 'cofelytics_offers', context);
  }

  getOffersByBrandId(brandId) {
    const query = this.db(this.tableName)
      .where('brand_id', brandId)
      .orderBy('start_date', 'asc');
    return query;
  }

  async validateTargetInfo(input) {
    const errors = [];
    const brand = await this.context.brand.getById(input.brandId);
    if (!brand) {
      errors.push(TargetCustomerGroupError.INVALID_BRAND);
    } else if (!brand.cofelytics) errors.push(TargetCustomerGroupError.DISABLE_COFELYTICS);
    if (errors.length > 0) return errors;
    if (input.targetBranchIds.length === 0) {
      errors.push(TargetCustomerGroupError.INVALID_BRANCHES);
    } else {
      const branchIds = input.targetBranchIds.map(branch => { return branch.value; });
      const checkInfo = await this.roDb('brand_locations')
        .select(this.roDb.raw('count(id) as branches, array_agg(distinct(brand_id)) as brands'))
        .whereIn('id', branchIds).first();
      if (checkInfo.branches != input.targetBranchIds.length || checkInfo.brands.length != 1 || checkInfo.brands[0] !== input.brandId) {
        errors.push(TargetCustomerGroupError.INVALID_BRANCHES);
      }
      if (input.targetAllBranch) {
        const branchNumber = await this.roDb('brand_locations')
          .select(this.roDb.raw('count(id)'))
          .where('brand_id', input.brandId)
          .first();
        if (branchNumber.count != input.targetBranchIds.length) {
          errors.push(TargetCustomerGroupError.INVALID_BRANCHES);
        }
      }
    }
    if (input.targetCustomerRewardTierEnable) {
      if (!input.targetCustomerRewardId || !input.targetCustomerRewardTiers || input.targetCustomerRewardTiers.length === 0) {
        errors.push(TargetCustomerGroupError.INVALID_REWARD_TIER);
      } else {
        const tierIds = input.targetCustomerRewardTiers.map(tier => { return tier.value; });
        const tiersNumber = await this.roDb('reward_tiers as rt')
          .select(this.roDb.raw('count(rt.id) as tiers'))
          .join('rewards as r', 'r.id', 'rt.reward_id')
          .whereIn('rt.id', tierIds)
          .where('r.brand_id', input.brandId)
          .where('r.id', input.targetCustomerRewardId).first();
        if (tiersNumber.tiers != input.targetCustomerRewardTiers.length) {
          errors.push(TargetCustomerGroupError.INVALID_REWARD_TIER);
        }
        if (input.targetAllReward) {
          const tiersNumber = await this.roDb('reward_tiers as rt')
            .select(this.roDb.raw('count(rt.id)'))
            .join('rewards as r', 'r.id', 'rt.reward_id')
            .where('r.brand_id', input.brandId)
            .where('r.id', input.targetCustomerRewardId).first();
          if (tiersNumber.count != tierIds.length) {
            errors.push(TargetCustomerGroupError.INVALID_REWARD_TIER);
          }
        }
      }
    }
    return errors;
  }

  async validateOfferInfo(input) {
    const errors = [];
    const now = moment(new Date(), DATE_FORMAT).startOf('day').utcOffset(0, true);
    if (now.isAfter(moment(input.startDate, DATE_FORMAT).startOf('day'))) {
      errors.push(TargetCustomerGroupError.INVALID_STARTDATE);
    }
    if (input.duration < 1) {
      errors.push(TargetCustomerGroupError.INVALID_DURATION);
    }
    let emptyPlatform = true;
    if (input.platforms.includes('SMS') || input.platforms.includes('ALL')) {
      emptyPlatform = false;
      const arSMSText = input.smsInfo?.ar;
      const enSMSText = input.smsInfo?.en;
      if (!arSMSText || !enSMSText) {
        errors.push(TargetCustomerGroupError.MISSING_SMS_OFFER_TEXT);
      }
    }
    if (input.platforms.includes('EMAIL')) {
      emptyPlatform = false;
      const arEmailTitle = input.emailInfo?.arTitle;
      const arEmailText = input.emailInfo?.arText;
      const enEmailTitle = input.emailInfo?.enTitle;
      const enEmailText = input.emailInfo?.enText;
      if (!arEmailTitle || !arEmailText || !enEmailTitle || !enEmailText) {
        errors.push(TargetCustomerGroupError.MISSING_EMAIL_OFFER_TEXT);
      }
    }
    if (input.platforms.includes('PUSH') || input.platforms.includes('ALL')) {
      emptyPlatform = false;
      const arPushTitle = input.pushNotificationInfo?.arTitle;
      const arPushText = input.pushNotificationInfo?.arText;
      const enPushTitle = input.pushNotificationInfo?.enTitle;
      const enPushText = input.pushNotificationInfo?.enText;
      if (!arPushTitle || !arPushText || !enPushTitle || !enPushText) {
        errors.push(TargetCustomerGroupError.MISSING_PUSH_OFFER_TEXT);
      }
    }
    if (emptyPlatform) {
      errors.push(TargetCustomerGroupError.MISSING_PLATFORM_DATA);
    }
    if (input.images) {
      let isValid = true;
      map(input.images, url => {
        if (isValid && !url.match(regex)) {
          isValid = false;
        }
      });
      if (!isValid) errors.push(TargetCustomerGroupError.INVALID_IMAGES_URL);
    }
    return errors;
  }

  async calculateTargetExistingCustomerGroup(input) {
    const errors = await this.validateTargetInfo(input);
    if (errors.length > 0) return {errors};
    const brand = await this.context.brand.getById(input.brandId);
    const branchIds = input.targetBranchIds.map(branch => { return branch.value; });
    const subQuery = this.db('order_sets as os')
      .select(this.roDb.raw('count(*), sum(os.total), os.customer_id'))
      .whereIn('os.brand_location_id', branchIds);
      /*
    if (input.targetAllBranch) {
      subQuery
        .join('brand_locations as bl', 'bl.id', 'os.brand_location_id')
        .where('bl.brand_id', brand.id);
    } else subQuery.whereIn('os.brand_location_id', input.targetBranchIds);
    */
    if (input.targetCustomerDateRange !== 'ALL_CUSTOMERS') {
      const startDate = moment(new Date(), DATE_FORMAT).startOf('day').utcOffset(0, true);
      switch (input.targetCustomerDateRange) {
        case 'LAST_3_MONTHS':
          startDate.subtract(3, 'months');
          break;
        case 'LAST_6_MONTHS':
          startDate.subtract(6, 'months');
          break;
        case 'LAST_9_MONTHS':
          startDate.subtract(9, 'months');
          break;
        case 'LAST_YEAR':
          startDate.subtract(12, 'months');
          break;
        default:
          break;
      }
      subQuery.where('os.created_at', '>=', startDate.toISOString());
    }
    let moreThan = 2;
    switch (input.targetCustomerOrderRange) {
      case 'MORE_THAN_5':
        moreThan = 5;
        break;
      case 'MORE_THAN_10':
        moreThan = 10;
        break;
      case 'MORE_THAN_15':
        moreThan = 15;
        break;
      case 'MORE_THAN_20':
        moreThan = 20;
        break;
      default:
        break;
    }
    subQuery.where('os.current_status', 'COMPLETED').groupBy('os.customer_id').havingRaw('count(os.id) >= ?', [moreThan]);
    let query = subQuery.clone();
    if (input.targetCustomerRewardTierEnable) {
      const tierIds = input.targetCustomerRewardTiers.map(tier => { return tier.value; });
      query = this.roDb
        .select(this.roDb.raw('ord.*, rt.title'))
        .from(subQuery.as('ord'))
        .joinRaw(`
          INNER JOIN customer_tiers as ct ON ct.id = (
            select id from customer_tiers where customer_id = ord.customer_id and reward_id = ? Order By created Desc limit 1
          )
        `, input.targetCustomerRewardId)
        .leftJoin('reward_tiers as rt', 'rt.id', 'ct.reward_tier_id')
        .whereIn('ct.reward_tier_id', tierIds);
    }
    const response = await query;
    if (response.length > 0) {
      let totalOrder = 0;
      const country = await this.context.country.getById(brand.countryId);
      const currency = await this.context.currency.getById(country.currencyId);
      let totalFee = new CurrencyValue(
        0,
        currency.decimalPlace,
        currency.lowestDenomination
      );
      const customers = [];
      response.map(element => {
        totalOrder += parseInt(element.count);
        const amount = new CurrencyValue(
          element.sum,
          currency.decimalPlace,
          currency.lowestDenomination
        );
        totalFee = totalFee.add(amount.toCurrencyValue());
        customers.push(element.customerId);
      });
      return { customerCount: response.length, averageAmount: totalFee.div(totalOrder), currencyId: currency.id, customers};
    } else return {errors: [TargetCustomerGroupError.INVALID_TARGET_GROUP]};
  }

  async saveExistingCustomerCofelytics(targetInfo, offerInfo) {
    const offerInfoErrors = await this.validateOfferInfo(offerInfo);
    if (offerInfoErrors.length > 0) return {status: false, error: offerInfoErrors[0], errors: offerInfoErrors};
    const customerGroup = await this.calculateTargetExistingCustomerGroup(targetInfo);
    if (customerGroup?.errors) return {status: false, error: customerGroup.errors[0], errors: customerGroup.errors};
    const cofelyticsOffer = {
      brandId: targetInfo.brandId,
      targetType: 'EXISTING_CUSTOMERS',
      allBranch: targetInfo.targetAllBranch,
      averageAmount: customerGroup.averageAmount.value,
      currencyId: customerGroup.currencyId,
      customerCount: customerGroup.customerCount,
      offer: offerInfo.offer,
      startDate: moment(offerInfo.startDate, DATE_FORMAT).startOf('day'),
      offerDuration: offerInfo.duration,
      sms: offerInfo.platforms.includes('SMS') || offerInfo.platforms.includes('ALL'),
      smsInfo: offerInfo?.smsInfo || null,
      email: offerInfo.platforms.includes('EMAIL'),
      emailInfo: offerInfo?.emailInfo || null,
      push: offerInfo.platforms.includes('PUSH') || offerInfo.platforms.includes('ALL'),
      pushInfo: offerInfo?.pushNotificationInfo || null,
      images: offerInfo?.images || null,
      requestData: {...targetInfo, ...offerInfo}
    };

    const id = await super.save(cofelyticsOffer);
    const customerURL = await generateCustomersCSVFile.apply({ db: this.db }, [id, customerGroup.customers]);
    const branchIds = targetInfo.targetBranchIds.map(branch => { return branch.value; });
    const branchURL = await generateBranchesCSVFile.apply({ db: this.db }, [id, branchIds]);
    await super.save({id, customersCsvUrl: customerURL, branchsCsvUrl: branchURL});
    /*
    const customerList = map(customerGroup.customers, customer => {
      return {offerId: id, customerId: customer};
    });
    let branchList = [];
    if (targetInfo.targetAllBranch) {
      const branches = await this.db('brand_locations')
        .select('id')
        .where('brand_id', targetInfo.brandId);
      branchList = map(branches, branch => {
        return {offerId: id, branchId: branch.id};
      });
    } else {
      branchList = map(targetInfo.targetBranchIds, branch => {
        return {offerId: id, branchId: branch};
      });
    }
    */
    //await this.context.cofelyticsOfferCustomers.save(customerList);
    //await this.context.cofelyticsOfferBranches.save(branchList);
    return {status: true, id};
  }

  async calculateTargetNewCustomerGroup(brandId) {
    const errors = [];
    const brand = await this.context.brand.getById(brandId);
    if (!brand) {
      errors.push(TargetCustomerGroupError.INVALID_BRAND);
    } else if (!brand.cofelytics) errors.push(TargetCustomerGroupError.DISABLE_COFELYTICS);
    if (errors.length > 0) return {errors};
    const query = this.db('view_orders as vo')
      .select(this.roDb.raw('vo.customer_id, sum(vo.total) as total, count(vo.*) as order_count'))
      .where('vo.country_id', brand.countryId)
      .andWhereRaw(
        'vo.created_at > (now() - INTERVAL \'3 MONTH\')'
      )
      .whereNotIn('vo.customer_id', this.db.raw('SELECT DISTINCT(vo2.customer_id) from view_orders as vo2 where vo2.brand_id = ?', brand.id))
      .groupBy('vo.customer_id')
      .havingRaw('sum(vo.total) > ?', [0]);
    const response = await query;
    if (response.length > 0) {
      let totalOrder = 0;
      const country = await this.context.country.getById(brand.countryId);
      const currency = await this.context.currency.getById(country.currencyId);
      let totalFee = new CurrencyValue(
        response.total,
        currency.decimalPlace,
        currency.lowestDenomination
      );
      const customers = [];
      response.map(element => {
        totalOrder += parseInt(element.orderCount);
        const amount = new CurrencyValue(
          element.total,
          currency.decimalPlace,
          currency.lowestDenomination
        );
        totalFee = totalFee.add(amount.toCurrencyValue());
        customers.push(element.customerId);
      });
      return {customerCount: response.length, averageAmount: totalFee.div(totalOrder), currencyId: currency.id, customers};
    } else return {errors: [TargetCustomerGroupError.INVALID_TARGET_GROUP]};
  }

  async saveNewCustomerCofelytics(brandId, offerInfo) {
    const offerInfoErrors = await this.validateOfferInfo(offerInfo);
    if (offerInfoErrors.length > 0) return {status: false, error: offerInfoErrors[0], errors: offerInfoErrors};
    const customerGroup = await this.calculateTargetNewCustomerGroup(brandId);
    if (customerGroup?.errors) return {status: false, error: customerGroup.errors[0], errors: customerGroup.errors};
    const cofelyticsOffer = {
      brandId,
      targetType: 'NEW_CUSTOMERS',
      allBranch: true,
      averageAmount: customerGroup.averageAmount.value,
      currencyId: customerGroup.currencyId,
      customerCount: customerGroup.customerCount,
      offer: offerInfo.offer,
      startDate: moment(offerInfo.startDate, DATE_FORMAT).startOf('day'),
      offerDuration: offerInfo.duration,
      sms: offerInfo.platforms.includes('SMS') || offerInfo.platforms.includes('ALL'),
      smsInfo: offerInfo?.smsInfo || null,
      email: offerInfo.platforms.includes('EMAIL'),
      emailInfo: offerInfo?.emailInfo || null,
      push: offerInfo.platforms.includes('PUSH') || offerInfo.platforms.includes('ALL'),
      pushInfo: offerInfo?.pushNotificationInfo || null,
      images: offerInfo?.images || null,
      requestData: {...brandId, ...offerInfo}
    };

    const id = await super.save(cofelyticsOffer);
    const customerURL = await generateCustomersCSVFile.apply({ db: this.db }, [id, customerGroup.customers]);
    const branchURL = await generateBranchesCSVFileByBrandId.apply({ db: this.db }, [id, brandId]);
    await super.save({id, customersCsvUrl: customerURL, branchsCsvUrl: branchURL});
    /*
    const customerList = map(customerGroup.customers, customer => {
      return {offerId: id, customerId: customer};
    });
    console.log('L', customerList.length);
    if(customerList.length <10000){
     const times = Math.ceil(10000/customerList.length);
     let customerTempList = []
     for (let index = 0; index < times; index++) {
      customerTempList = customerTempList.concat(customerList);
     }
     customerList = customerTempList;
    }
    console.log('L2', customerList.length);
     await this.context.cofelyticsOfferCustomers.save(customerList);
    */
    return {status: true, id};
  }

  async generateCofelyticsOfferMail(offerId, isAllBranch) {
    const offerContent = await this.generateCofelyticsOfferContent(offerId, isAllBranch);
    if (offerContent) {
      // After Notification Lambda Update Delete following lines
      offerContent.sender = senderEmail;
      offerContent.receiverEmail = receiverEmail;
      await this.context.notification.sendNotificationContentToQueue(
        notificationMedia.EMAIL,
        notificationProviders.AWS_SES,
        offerContent
      );
    }
  }

  async generateCofelyticsOfferContent(offerId, isAllBranch) {
    try {
      const offer = await this.getById(offerId);
      if (!offer) throw 'Offer not found for COFELytics!';
      const brand = await this.context.brand.getById(offer.brandId);
      if (!brand) throw 'Brand not found for COFELytics!';
      const country = await this.context.country.getById(brand.countryId);
      const subject = 'COFELytics';

      const templateData = {
        brand_id: brand.id,
        brand_name: brand.name,
        country: country.name.en,
        target_type: offer.targetType,
        customer_count: offer.customerCount,
        customer_order_range: offer.requestData?.targetCustomerOrderRange,
        customer_date_range: offer.requestData?.targetCustomerDateRange,
        tiers_enabled: offer.requestData?.targetCustomerRewardTierEnable,
        tiers: map(offer.requestData?.targetCustomerRewardTiers, tier => { return tier.label; }),
        offer: offer.offer,
        start_date: offer.startDate,
        offer_duration: offer.offerDuration,
        branchs_csv_url: offer.branchsCsvUrl,
        customers_csv_url: offer.customersCsvUrl,
        platforms:  offer.requestData.platforms,
        sms: {
          display: offer.sms,
          text: {
            en: offer.smsInfo?.en,
            ar: offer.smsInfo?.ar
          }
        },
        email: {
          display: offer.email,
          title: {
            en: offer.emailInfo?.enTitle,
            ar: offer.emailInfo?.arTitle
          },
          text: {
            en: offer.emailInfo?.enText,
            ar: offer.emailInfo?.arText
          }
        },
        push: {
          display: offer.push,
          title: {
            en: offer.pushInfo?.enTitle,
            ar: offer.pushInfo?.arTitle
          },
          text: {
            en: offer.pushInfo?.enText,
            ar: offer.pushInfo?.arText
          }
        },
        images: offer.images ? offer.images : null,
      };

      const templateDir = path.resolve('templates', 'dist', 'en');
      const cofelyticsPath = path.join(templateDir, 'cofelytics.html');
      const cofelyticsFile = fs.readFileSync(cofelyticsPath, 'utf8');
      const cofelyticsTemplate = template(cofelyticsFile);
      const cofelyticsMail = cofelyticsTemplate(templateData);

      let audience = 'Customers who haven\'t ordered before';
      if (offer.targetType === 'EXISTING_CUSTOMERS') {
        audience = `
      Customers who have ordered before
      Type of customer
      ${offer.requestData.targetCustomerOrderRange}
      Number of previous orders
      ${offer.requestData.targetCustomerDateRange}
      Target reward customers
      `;
        if (offer.requestData.targetCustomerRewardTierEnable) {
          audience += `
      Yes
      Which tier would you like to target
      ${map(offer.requestData?.targetCustomerRewardTiers, tier => { return tier.label; })}
      `;
        } else audience += `
      No
      `;
      }

      let textView = '';

      if (offer.smsInfo) {
        textView += `
      SMS Text (English)
      ${offer.smsInfo.en}
      SMS Text (Arabic)
      ${offer.smsInfo.ar}
      `;
      }
      if (offer.emailInfo) {
        textView += `
      Email Text (English)
      Title: ${offer.emailInfo.enTitle}
      Text: ${offer.emailInfo.enText}
      Email Text (Arabic)
      Title: ${offer.emailInfo.arTitle}
      Text: ${offer.emailInfo.arText}
      `;
      }
      if (offer.pushInfo) {
        textView += `
      Push notification (English)
      Title: ${offer.pushInfo.enTitle}
      Text: ${offer.pushInfo.enText}
      Push notification (Arabic)
      Title: ${offer.pushInfo.arTitle}
      Text: ${offer.pushInfo.arText}
      `;
      }
      if (offer.images?.length > 0) {
        let images = 'Images';
        offer.images.map(image => {
          images += `
      ${image}`;
        });
        textView += `
      ${images}
      `;
      }

      const composedText = `
      COFELytics Offer

      Customer segmentation review

      Brand ID
      ${brand.id}
      Brand Name
      ${brand.name}(${country.name.en})
      Number of customers this offer will target
      Approximately  ${offer.customerCount} customers
      Audience
      ${audience}

      ********************

      Build you offer review

      Offer type
      ${offer.offer}
      Offer start date
      ${offer.startDate}
      Weeks recurring
      Run offer for ${offer.offerDuration} weeks
      Offer sent via
      ${offer.requestData.platforms}
      Branches: ${offer.branchsCsvUrl}
      Customers: ${offer.customersCsvUrl}

      ********************

      Offer text review
      ${textView}
      `;
      return {
        subject,
        html: cofelyticsMail,
        text: composedText,
      };
    } catch (error) {
      await SlackWebHookManager.sendTextAndObjectToSlack('COFELytics Offer mail can not generating! ' + error, {offerId});
      return null;
    }
  }

  async saveCofelyticsRequest(brandId, email) {
    const errors = [];
    const brand = await this.context.brand.getById(brandId);
    if (!brand) {
      errors.push(TargetCustomerGroupError.INVALID_BRAND);
    } else if (brand.cofelytics) errors.push(TargetCustomerGroupError.COFELYTICS_ALREADY_ENABLE);
    const request = await this.roDb('cofelytics_requests')
      .select('*')
      .where('brand_id', brandId).first();
    if (request) errors.push(TargetCustomerGroupError.REQUEST_ALREADY_CREATED);
    if (errors.length > 0) return {status: false, error: errors[0], errors};
    return await this.context.db.transaction(async trx => {
      const id = uuid.get();
      await trx('cofelytics_requests').insert({
        id,
        brandId,
        countryId: brand.countryId,
        status: cofelyticsRequestStatus.REQUESTED,
        email
      });
      return {status: true, id };
    }).catch(async error => {
      await SlackWebHookManager.sendTextAndObjectToSlack('COFELytics Request can not inserted to table! ' + error, {brandId});
      return {status: false, error: TargetCustomerGroupError.TRANSACTIONAL_ERROR, errors: [TargetCustomerGroupError.TRANSACTIONAL_ERROR] };
    });
  }

  async generateCofelyticsRequestMail(requestId) {
    try {
      const request = await this.roDb('cofelytics_requests')
        .select('*')
        .where('id', requestId).first();
      const brand = await this.context.brand.getById(request.brandId);
      const country = await this.context.country.getById(request.countryId);
      const html = `
        COFElytics Requested by:
        <hr>
        <br /><br />
        Brand Name: ${brand.name} <br />
        Brand ID: ${brand.id} <br />
        Brand Admin Email: ${request.email} <br />
        Brand Country: ${country.name.en} <br />
        `;
      const text = html;
      const requestContent = {
        sender: senderEmail,
        receiverEmail,
        html,
        text,
        subject: 'COFElytics Request'
      };
      await this.context.notification.sendNotificationContentToQueue(
        notificationMedia.EMAIL,
        notificationProviders.AWS_SES,
        requestContent
      );
      return true;
    } catch (error) {
      await SlackWebHookManager.sendTextAndObjectToSlack('COFELytics Request mail can not generating! ' + error, {requestId});
      return false;
    }
  }

  async getRequestList(countryId, status) {
    const select = `cr.*, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr,
    c.name as country_name, c.name_ar as country_name_ar, c.name_tr as country_name_tr`;
    const query = this.roDb('cofelytics_requests as cr')
      .select(this.db.raw(select))
      .leftJoin('brands as b', 'b.id', 'cr.brand_id')
      .leftJoin('countries as c', 'c.id', 'cr.country_id');
    if (countryId) {
      query.where('cr.country_id', countryId);
    }
    if (status) {
      query.where('cr.status', status);
    }
    let requestList = await query.orderBy('cr.created', 'DESC');
    requestList = addLocalizationField(
      addLocalizationField(requestList, 'brandName'),
      'countryName'
    );
    return {requests: requestList};
  }

  async saveRequestStatus(id, status) {
    const request = await this.roDb('cofelytics_requests')
      .select('*')
      .where('id', id).first();
    if (!request) {
      return {status: false, error: TargetCustomerGroupError.INVALID_REQUEST, errors: [TargetCustomerGroupError.INVALID_REQUEST]};
    } else if (request.status === status) {
      return {status: false, error: TargetCustomerGroupError.REQUEST_SAME_STATUS, errors: [TargetCustomerGroupError.REQUEST_SAME_STATUS]};
    }
    const updated = await this.db('cofelytics_requests')
      .where({id})
      .update({status});
    if (updated > 0) {
      const select = `cr.*, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr,
      c.name as country_name, c.name_ar as country_name_ar, c.name_tr as country_name_tr`;
      const query = this.roDb('cofelytics_requests as cr')
        .select(this.db.raw(select))
        .leftJoin('brands as b', 'b.id', 'cr.brand_id')
        .leftJoin('countries as c', 'c.id', 'cr.country_id')
        .where('cr.id', id)
        .first();
      const updatedRequest = await query;
      return {status: true,
        request: addLocalizationField(
          addLocalizationField(updatedRequest, 'brandName'),
          'countryName'
        )
      };
    } else {
      await SlackWebHookManager.sendTextAndObjectToSlack('COFELytics Request Status can not updated! ', {id, status});
      return {status: false, error: TargetCustomerGroupError.TRANSACTIONAL_ERROR, errors: [TargetCustomerGroupError.TRANSACTIONAL_ERROR] };
    }
  }

  async getCofelyticsRequestStatusByBrandId(brandId) {
    const brand = await this.context.brand.getById(brandId);
    if (brand) {
      const request = await this.roDb('cofelytics_requests')
        .select('*')
        .where('brand_id', brandId)
        .orderBy('created', 'ASC').first();
      if (request) return { status: true};
      return {status: false};
    } else {
      return {error: TargetCustomerGroupError.INVALID_BRAND, errors: [TargetCustomerGroupError.INVALID_BRAND]};
    }

  }
}

module.exports = CofelyticsOffers;
