const _ = require('lodash');
const moment = require('moment');

const { isTest } = require('../../../../config');
const { now } = require('../../../lib/util');
const { computeOpenTimeRanges } = require('../../../lib/schedules');
const { orderTypes, firstOrdersType } = require('../../root/enums');
const { paymentSchemes } = require('../../../payment-service/enums');
const { orderFulfillmentTypes, orderCreateError } = require('../enums');
const getItemsPrice = require('./get-items-price');
const calculatePrice = require('./calculate-price');

const paymentMethodValid = paymentMethod => {
  if (
    paymentMethod &&
    _.includes(Object.keys(paymentSchemes), paymentMethod.paymentScheme)
  ) {
    if (paymentMethod.paymentScheme === paymentSchemes.CASH) {
      return true;
    } else if (!paymentMethod.sourceId) {
      // only CASH doesn't have an sourceId
      return false;
    }

    return true;
  }

  return false;
};

// eslint-disable-next-line complexity
const validateOrder = context => async input => {
  let errors = [];
  const { items, brandLocationId, paymentMethod, customerId, invoice } = input;
  let { usePerks } = input;
  const { fulfillment } = input;
  const couponId = _.get(input, 'couponId', null);
  const giftCardIds = _.get(input, 'giftCardIds', []);
  const orderType =
    fulfillment.type === orderFulfillmentTypes.DELIVERY
      ? orderTypes.DELIVERY
      : fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY
        ? orderTypes.EXPRESS_DELIVERY
        : orderTypes.PICKUP;

  if (
    orderType === orderTypes.DELIVERY ||
    orderType === orderTypes.EXPRESS_DELIVERY
  ) {
    if (fulfillment.id) {
      // Then a customer address
      const customerAddress = await context.customerAddress.getById(
        fulfillment.id
      );

      if (!customerAddress) {
        errors.push(orderCreateError.INVALID_CUSTOMER_ADDRESS);
      } else if (customerAddress.customerId !== input.customerId) {
        errors.push(orderCreateError.WRONG_CUSTOMER_ADDRESS);
      }
    } else {
      errors.push(orderCreateError.ADDRESS_REQUIRED);
    }
  } else if (fulfillment.type === orderFulfillmentTypes.CAR) {
    if (fulfillment.id) {
      const customerCar = await context.customerCar.getById(fulfillment.id);
      if (!customerCar) {
        errors.push(orderCreateError.INVALID_CUSTOMER_VEHICLE);
      } else if (customerCar.customerId !== input.customerId) {
        errors.push(orderCreateError.WRONG_CUSTOMER_VEHICLE);
      }
    } else {
      errors.push(orderCreateError.VEHICLE_REQUIRED);
    }
  }

  input = await getItemsPrice(context)(input);

  const { currencyId, amountDue, subtotal } = await calculatePrice(context)(
    input,
    orderType
  );

  // if amountDue is not high minimum order amount order is not valid
  const {
    minimumDeliveryOrderAmount,
    minimumExpressDeliveryOrderAmount,
  } = await context.brand.getByBrandLocation(brandLocationId);
  if (
    orderType === orderTypes.DELIVERY &&
    parseFloat(subtotal) < parseFloat(minimumDeliveryOrderAmount)
  ) {
    errors.push(orderCreateError.INSUFFICIENT_DELIVERY_ORDER_VALUE);
  }

  if (
    orderType === orderTypes.EXPRESS_DELIVERY &&
    parseFloat(subtotal) < parseFloat(minimumExpressDeliveryOrderAmount)
  ) {
    errors.push(orderCreateError.INSUFFICIENT_EXPRESS_DELIVERY_ORDER_VALUE);
  }

  // we need currencyId For partial payments
  const isValidCustomer = await context.customer.isValid({
    id: customerId,
  });
  if (!isValidCustomer) {
    errors.push(orderCreateError.INVALID_CUSTOMER);
  }

  const brandLocation = await context.brandLocation.getById(brandLocationId);

  if (brandLocation) {
    if (!brandLocation.acceptingOrders) {
      errors.push(orderCreateError.BRAND_LOCATION_NOT_ACCEPTING_ORDERS);
    }
  } else {
    errors.push(orderCreateError.INVALID_BRAND_LOCATION);
  }

  if (couponId !== null) {
    const coupon = await context.coupon.getById(couponId);
    const isValidCoupon = await context.coupon.isCouponAvailableForCustomer(
      couponId,
      customerId
    );

    const isValidBrandCoupon = await context.coupon.isCouponAvailableForBrand(
      brandLocationId,
      couponId
    );

    const isValidCustomerGroup = await context.coupon.isValidCustomerGroup(
      couponId,
      customerId
    );
    let isConsumedByBrand = false;
    if (coupon && coupon.onlyFirstOrdersFor === firstOrdersType.BRAND) {
      let stats = {};
      if (coupon.onlyFirstOrders === true) {
        stats = await context.customerStats.getByCustomerForBrand(
          customerId,
          brandLocation.brandId
        );
      } else if (coupon.onlyFirstOrders === false) {
        stats = await context.customerStats.getByCustomerForBrandUsingParticularCoupon(
          customerId,
          brandLocation.brandId,
          couponId
        );
      }

      if (
        stats &&
        stats.totalOrders >= Number(coupon.firstOrdersRedemptionLimit)
      ) {
        isConsumedByBrand = true;
      }
    }

    if (
      !isValidCoupon ||
      (!isValidBrandCoupon && !isTest) ||
      !isValidCustomerGroup ||
      isConsumedByBrand
    ) {
      if (!isTest) {
        console.log(
          'isValidBrandCoupon =',
          isValidBrandCoupon,
          'isValidCoupon =',
          isValidCoupon,
          'isValidCustomerGroup =',
          isValidCustomerGroup,
          'isConsumedByBrand =',
          isConsumedByBrand
        );
      }
      errors.push(orderCreateError.INVALID_COUPON);
    }
  }

  // const paymentMethodInput = _.get(input, 'paymentMethod');
  // let paymentMethod = paymentMethodInput ? paymentMethodInput.id : '';
  //
  // // TODO: useCredits - deprecated -> to be removed in future versions
  // const useCredits = _.get(input, 'useCredits', false);
  // if (!paymentMethod && useCredits) {
  //   paymentMethod = orderPaymentMethods.CREDITS;
  // }

  // if (paymentMethod === orderPaymentMethods.CREDITS) {
  //   // Validate that the customer has enought credit
  //   const customerBalance = await context.loyaltyTransaction.getBalanceByCustomer(
  //     customerId,
  //     currency.id
  //   );
  //
  //   if (Number(customerBalance) < Number(orderTotal)) {
  //     errors.push(orderCreateError.INSUFFICIENT_CREDITS);
  //   }
  // }

  if (giftCardIds && giftCardIds.length > 0) {
    const giftCard = await context.giftCard.getById(giftCardIds[0]);
    if (giftCard) {
      if (giftCard.currencyId !== currencyId) {
        errors.push(orderCreateError.INVALID_GIFT_CARD_CURRENCY);
      }
      // Validate that the customer has enough credit on selected giftCard
      const giftCardBalance = await context.giftCardTransaction.getGiftCardBalance(
        giftCardIds[0]
      );

      if (Number(giftCardBalance) <= 0) {
        errors.push(orderCreateError.INSUFFICIENT_GIFT_CARD_CREDITS);
      }
    } else {
      errors.push(orderCreateError.INVALID_GIFT_CARD);
    }
  }

  if (Number(amountDue) > 0 && !paymentMethodValid(paymentMethod) && !invoice) {
    errors.push(orderCreateError.PAYMENT_METHOD_REQUIRED);
  }

  if (paymentMethod && paymentMethod.paymentScheme === paymentSchemes.CASH) {
    if (!brandLocation.acceptsCash) {
      errors.push(orderCreateError.BRAND_DOESNT_ACCEPT_CASH);
    }
  }

  const datetimes = [moment(now.get()).tz(brandLocation.timeZoneIdentifier)];
  // console.log('datetimes', datetimes);
  const validateDateTime = async dt => {
    const now = dt;
    const numberOfDaysToScan = 1;
    const getWeeklySchedules = context.weeklySchedule.getByBrandLocation(
      brandLocationId
    );

    const getScheduleExceptions = context.scheduleException.getByBrandLocationIntersectingTimeRange(
      brandLocationId,
      now,
      now.clone().add(numberOfDaysToScan, 'days')
    );

    const [weeklySchedules, scheduleExceptions] = await Promise.all([
      getWeeklySchedules,
      getScheduleExceptions,
    ]);

    let weeklySchedulesFiltered = weeklySchedules;
    let deliverySchedulesFiltered = _.map(weeklySchedules, ws => _.clone(ws));
    let expressDeliverySchedulesFiltered = _.map(weeklySchedules, ws =>
      _.clone(ws)
    );

    deliverySchedulesFiltered.forEach((day, i) => {
      if (!deliverySchedulesFiltered[i].openAllDay) {
        deliverySchedulesFiltered[i].openTime =
          deliverySchedulesFiltered[i].deliveryOpenTime;
        deliverySchedulesFiltered[i].openDuration =
          deliverySchedulesFiltered[i].deliveryOpenDuration;
      }
    });

    // Coding gods, please forgive me for duplicate code
    expressDeliverySchedulesFiltered.forEach((day, i) => {
      if (!expressDeliverySchedulesFiltered[i].openAllDay) {
        expressDeliverySchedulesFiltered[i].openTime =
          expressDeliverySchedulesFiltered[i].expressDeliveryOpenTime;
        expressDeliverySchedulesFiltered[i].openDuration =
          expressDeliverySchedulesFiltered[i].expressDeliveryOpenDuration;
      }
    });

    // remove unneeded properties
    if (weeklySchedulesFiltered.length > 0) {
      weeklySchedulesFiltered = _.map(weeklySchedulesFiltered, w => {
        delete w.deliveryOpenTime;
        delete w.deliveryOpenDuration;
        delete w.expressDeliveryOpenTime;
        delete w.expressDeliveryOpenDuration;
        return w;
      });
    }
    if (deliverySchedulesFiltered.length > 0) {
      deliverySchedulesFiltered = _.map(deliverySchedulesFiltered, w => {
        delete w.deliveryOpenTime;
        delete w.deliveryOpenDuration;
        delete w.expressDeliveryOpenTime;
        delete w.expressDeliveryOpenDuration;
        return w;
      });
    }

    if (expressDeliverySchedulesFiltered.length > 0) {
      expressDeliverySchedulesFiltered = _.map(
        expressDeliverySchedulesFiltered,
        w => {
          delete w.deliveryOpenTime;
          delete w.deliveryOpenDuration;
          delete w.expressDeliveryOpenTime;
          delete w.expressDeliveryOpenDuration;
          return w;
        }
      );
    }

    const openTimeRanges = computeOpenTimeRanges(
      now,
      1,
      // timezone,
      brandLocation.timeZoneIdentifier,
      weeklySchedulesFiltered,
      scheduleExceptions,
      deliverySchedulesFiltered,
      expressDeliverySchedulesFiltered
    );
    // We may get multiple schedule items back, should a store have openings which go beyond midnight
    let schedulesToCheck = _.get(
      openTimeRanges,
      // Without camelCase the expressDelivery working hours dont work properly
      _.camelCase(orderType.toLowerCase()),
      []
    );
    // schedulesToCheck[]
    schedulesToCheck = _.map(schedulesToCheck, s => {
      return {
        begin: moment(s.begin).tz(brandLocation.timeZoneIdentifier),
        end: moment(s.end).tz(brandLocation.timeZoneIdentifier),
      };
    });

    if (!invoice) {
      if (
        !_.some(
          schedulesToCheck,
          schedule =>
            dt.isSameOrAfter(schedule.begin) && dt.isSameOrBefore(schedule.end)
        )
      ) {
        errors.push(orderCreateError.OUTSIDE_AVAILABLE_HOURS);
      }
    }

    return errors;
  };
  errors = _.uniq(
    _.union(
      _.flatten(await Promise.all(_.map(datetimes, validateDateTime))),
      errors
    )
  );

  const isValidMenuItem = async menuItem => {
    const errors = [];
    const validMenuItem = await context.menuItem.isValid({
      id: menuItem.itemId,
    });

    if (!validMenuItem) {
      errors.push(orderCreateError.INVALID_MENU_ITEM);
    }

    if (menuItem.quantity <= 0) {
      errors.push(orderCreateError.ZERO_QUANTITY_REQUESTED);
    }

    const validateMenuItemOption = async menuItemOption => {
      const isValidMenuItemOption = await context.menuItemOption.isValid({
        id: menuItemOption.optionId,
      });
      const errors = [];

      if (!isValidMenuItemOption) {
        errors.push(orderCreateError.INVALID_MENU_ITEM_OPTION);
      }

      return errors;
    };

    return _.uniq(
      _.union(
        _.flatten(
          await Promise.all(
            _.map(menuItem.selectedOptions, validateMenuItemOption)
          )
        ),
        errors
      )
    );
  };

  errors = _.uniq(
    _.union(_.flatten(await Promise.all(_.map(items, isValidMenuItem))), errors)
  );

  if (Array.isArray(usePerks) && usePerks.length === 0) {
    usePerks = undefined;
  }
  if (usePerks) {
    const customerCanUsePerks = await context.customer.canUsePerks(
      customerId,
      brandLocation.brandId,
      usePerks
    );
    // console.log('customerCanUsePerks', customerCanUsePerks);
    if (!customerCanUsePerks) {
      errors.push(orderCreateError.INVALID_PERK);
    }
  }

  return errors;
};

module.exports = validateOrder;
