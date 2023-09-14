/* eslint-disable camelcase */
const BaseModel = require('../../base-model');

const moment = require('moment');
const { countryConfigurationKeys, arrivedOrderSubscriptionEvent, orderSetStatusNames } = require('../root/enums');
const { orderFulfillmentTypes } = require('../order-set/enums');
const { branchArrivingTimeListError, saveArrivedError } = require('./enums');
const {
  contentTemplates,
} = require('../../lib/push-notification');
const { notificationCategories } = require('../../lib/notifications');
const ArrivedNotificationService = require('../arrived-notification/service');
const { publishArrivedOrderSubscriptionEvent } = require('../../lib/util');
const IGNORE_ARRIVED_STATUS = [
  orderSetStatusNames.INITIATED,
  orderSetStatusNames.PLACED,
  orderSetStatusNames.PAYMENT_CANCELED,
  orderSetStatusNames.PAYMENT_FAILURE,
  orderSetStatusNames.COMPLETED
];


class ArrivingTime extends BaseModel {
  constructor(db, context) {
    super(db, 'order_set_arriving_times', context);
  }

  async validate(branchId, countryId, fulfillmentType) {
    const errors = [];
    if (!branchId || !countryId || !fulfillmentType) {
      errors.push(branchArrivingTimeListError.INVALID_INPUT);
    }
    if (branchId && countryId) {
      const { branchCountry } = await this.db('brand_locations')
        .select('countries.id as branch_country')
        .join('countries', 'countries.currency_id', 'brand_locations.currency_id')
        .where('brand_locations.id', branchId)
        .first();
      if (countryId != branchCountry) {
        errors.push(branchArrivingTimeListError.INVALID_COUNTRY_FOR_BRANCH);
      }
    }
    if (fulfillmentType != orderFulfillmentTypes.PICKUP && fulfillmentType != orderFulfillmentTypes.CAR) {
      errors.push(branchArrivingTimeListError.INVALID_FULFILLMENT);
    }
    const configValues = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.I_AM_HERE_ENABLED, countryId);
    if (!configValues) {
      errors.push(branchArrivingTimeListError.NOT_SUPPORTED);
    } else {
      if (configValues.configurationValue === 'false') {
        errors.push(branchArrivingTimeListError.NOT_SUPPORTED);
      }
    }
    const { iAmHere } = await this.context.brandLocation.getIAmHereActivity(branchId);
    if (!iAmHere) {
      errors.push(branchArrivingTimeListError.NOT_SUPPORTED);
    }
    return errors;
  }


  async getBranchArrivingTimeList(branchId, countryId, fulfillmentType) {
    const errors = await this.validate(branchId, countryId, fulfillmentType);
    if (errors.length > 0) {
      return { errors };
    }
    let configurationKey;
    if (fulfillmentType === orderFulfillmentTypes.PICKUP) {
      configurationKey = countryConfigurationKeys.I_AM_HERE_PICKUP_OPTIONS;
    } else if (fulfillmentType === orderFulfillmentTypes.CAR) {
      configurationKey = countryConfigurationKeys.I_AM_HERE_CAR_OPTIONS;
    }
    let configValues;
    try {
      configValues = await this.context.countryConfiguration.getByKey(configurationKey, countryId);
    } catch (error) {
      errors.push(branchArrivingTimeListError.NO_VALUES);
      return { errors };
    }
    if (!configValues) {
      errors.push(branchArrivingTimeListError.NO_VALUES);
      return { errors };
    }
    const options = configValues.configurationValue.split(',').map(elem => parseInt(elem)).sort(function (a, b) { return a - b; });
    return { errors, arrivingTime: { options } };
  }

  getByOrderSetId(orderSetId) {
    return this.db(this.tableName)
      .where('order_set_id', orderSetId)
      .first();
  }

  async saveOrderSetArrivingTime(arrivingTimeObject) {
    const orderSet = await this.context.orderSet.getById(arrivingTimeObject.orderSetId);
    const arrivingTime = arrivingTimeObject;
    arrivingTime.branchId = arrivingTimeObject.brandLocationId;
    delete arrivingTime.brandLocationId;
    arrivingTime.selectedOption = arrivingTimeObject.selectedArrivalTime;
    delete arrivingTime.selectedArrivalTime;
    arrivingTime.orderSetCreationTime = orderSet.createdAt;
    arrivingTime.arrived = false;
    arrivingTime.arrivalTime = moment(arrivingTime.orderCreationTime)
      .add(arrivingTime.selectedOption, 'minutes')
      .toISOString();
    if (arrivingTime.selectedOption == 0) {
      arrivingTime.arrived = true;
      const customerId = this.context.auth.id;
      const arrivingPopupStatus = await this.context.customer.getPopUpStatus(customerId);
      if (!arrivingPopupStatus) {
        await this.context.customer.savePopUpStatus(
          customerId
        );
      }
    } else {
      //TODO call step function here in else with orderSetId and customerId
      const arrivedNotificationHandler = new ArrivedNotificationService(this.context);
      arrivedNotificationHandler.checkOrderAfterWait({
        orderSetId: arrivingTimeObject.orderSetId,
        customerId: this.context.auth.id,
        header: 'IViYXwxeLWy6Ht1E6B8n9RTTb5eJvab0',
        waitseconds: (arrivingTime.selectedOption + 1) * 60
      }).catch(() => { });

    }
    await this.save(arrivingTime);
  }

  async saveArrived(orderSetId) {
    const errors = [];
    const orderSetArrivingTime = await this.getByOrderSetId(orderSetId);
    let id;
    let eventAlreadySending = false;
    const arrivalTime = moment();
    let fulfillmentType = null;
    let shortCode = null;
    let branchId = null;
    let currentStatus = null;
    if (orderSetArrivingTime) {
      if (orderSetArrivingTime.arrived) {
        errors.push(saveArrivedError.ALREADY_ARRIVED);
        return { errors };
      }
      id = await this.save({ id: orderSetArrivingTime.id, arrivalTime: arrivalTime.toISOString(), arrived: true });
      eventAlreadySending = arrivalTime.isSameOrAfter(moment(orderSetArrivingTime.arrivalTime));
    } else {
      const { brandLocationId, createdAt, currencyId, shortCode: orderShortCode, currentStatus: orderCurrentStatus } = await this.context.orderSet.getById(orderSetId);
      branchId = brandLocationId;
      shortCode = orderShortCode;
      currentStatus = orderCurrentStatus;
      const { iAmHere } = await this.context.brandLocation.getIAmHereActivity(brandLocationId);
      if (!iAmHere) {
        errors.push(saveArrivedError.NOT_SUPPORTED);
        return { errors };
      }
      const country = await this.context.country.getByCurrencyId(currencyId);
      const configValues = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.I_AM_HERE_ENABLED, country.id);
      if (!configValues || (configValues && !configValues.configurationValue)) {
        errors.push(saveArrivedError.NOT_SUPPORTED);
        return { errors };
      }
      const { type } = await this.context.orderFulfillment.getByOrderSet(orderSetId);
      fulfillmentType = type;
      id = await this.save({
        orderSetId,
        branchId: brandLocationId,
        countryId: country.id,
        fulfillmentType: type,
        orderSetCreationTime: createdAt,
        selectedOption: null,
        arrivalTime: arrivalTime.toISOString(),
        arrived: true
      });
    }
    const arrivingTime = await this.getById(id);
    if (!eventAlreadySending) {
      if (!fulfillmentType) {
        const { type } = await this.context.orderFulfillment.getByOrderSet(orderSetId);
        fulfillmentType = type;
      }
      if (!shortCode || !branchId || !currentStatus) {
        const { brandLocationId, shortCode: orderShortCode, currentStatus: orderCurrentStatus } = await this.context.orderSet.getById(orderSetId);
        branchId = brandLocationId;
        shortCode = orderShortCode;
        currentStatus = orderCurrentStatus;
      }
      if (!IGNORE_ARRIVED_STATUS.includes(currentStatus)) {
        const order = {
          brandLocationId: branchId,
          orderSetId,
          fulfillmentType,
          shortCode,
          arrivalTime
        };
        await publishArrivedOrderSubscriptionEvent(
          this.context,
          order,
          arrivedOrderSubscriptionEvent.ARRIVED_ORDER_FOR_VENDOR
        );
      }
      /**
      * New Barista app has not subscription part. That's why it is removed
      */
      await this.context.brandLocationDevice.checkAndSendArrivedOrder(arrivingTime);
    }

    return { arrivingTime, errors };
  }

  async arrivedNotification(orderSetId, customerId) {
    const message = contentTemplates().contents.orderCustomerArrival;
    const heading = contentTemplates().headings.orderCustomerArrival;
    const subDescription = contentTemplates().dataTemplates.subDescription.orderCustomerArrival;

    return {
      push: [
        {
          customerId,
          message,
          heading,
          subDescription,
          notificationCategory: notificationCategories.ORDER_CUSTOMER_ARRIVAL,
          orderSetId,
        },
      ],
      email: []
    };
  }

}


module.exports = ArrivingTime;
