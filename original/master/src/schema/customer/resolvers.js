const { isGuestCustomer, getExtraFields } = require('./utils');

const { paymentProvider, customerAddressType } = require('../root/enums');
const { addLocalizationField } = require('./../../lib/util');
const { microservices } = require('../../../config');
const { map, sortBy, reverse } = require('lodash');
const moment = require('moment');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');

module.exports = {
  Customer: {
    async referralCode({ id, referralCode }, args, context) {
      if (referralCode) {
        return referralCode;
      }
      return context.customer.generateAndSaveReferralCodeForCustomer(id);
    },
    async newCustomer({ id }, args, context) {
      const noOfOrders = await context.orderSet.getCountByCustomer(id);
      return noOfOrders <= 1;
    },
    async addresses({ id }, args, context) {
      const result = await context.customerAddress.getByCustomer(id);
      const addressFields = await context.addressField.getAll();
      return result.map(address => {
        /*
         * Mobile side prefer to use address type to show correct icons
         * old addresses type has been marked as CUSTOM
         * older version uses only friendlyName
         * */
        if (
          !address.type ||
          (address.type !== customerAddressType.HOME &&
            address.type !== customerAddressType.OFFICE)
        ) {
          address.type = customerAddressType.CUSTOM;
        }
        return {
          ...address,
          extraFields: getExtraFields(
            addressFields.filter(
              field => field.isoCode === address.countryCode
            ),
            address.dynamicData
          ),
        };
      });
    },
    async defaultAddress({ id }, args, context) {
      const result = await context.customerAddress.getDefaultByCustomer(id);
      if (result) {
        const addressFields = await context.addressField.getAllByCountryCode(
          result.countryCode
        );
        result.extraFields = getExtraFields(addressFields, result.dynamicData);
      }

      return result;
    },
    cars({ id }, args, context) {
      return context.customerCar.getByCustomer(id);
    },
    defaultCar({ id }, args, context) {
      return context.customerCar.getDefaultByCustomer(id);
    },
    async discoveryCredit({ id }, { countryIso, addIfNotFound }, context) {
      const country = await context.country.getByIsoCode(countryIso);
      if (country) {
        if (addIfNotFound) {
          // Should be set as FALSE always by the FE/ADMIN PORTAL TEAM, mobile team shuold always set as true.
          // If the call is coming from mobile/addIfNotFound is set as true. we will add credits automatically if enabled in that country.
          // await context.discoveryCredit.rewardDiscoveryredits(id, country.id);
        }

        return context.discoveryCredit.getByCustomerAndCountryId(
          id,
          country.id
        );
      }
      return null;
    },
    discoveryCredits({ id }, args, context) {
      return context.discoveryCredit.getByCustomerId(id);
    },
    async country({ countryId }, args, context) {
      const country = addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
      return country;
    },
    defaultDeviceMetadata({ id }, args, context) {
      return context.deviceMetadata.getDefaultByCustomer(id);
    },
    deviceMetadata({ id }, args, context) {
      return context.deviceMetadata.getByCustomer(id);
    },
    notificationSettings({
      smsDeliveryUpdates,
      smsPickupUpdates,
      pushDeliveryUpdates,
      pushPickupUpdates,
      newOffers,
      allowSms,
      allowEmail,
    }) {
      return {
        smsDeliveryUpdates,
        smsPickupUpdates,
        pushDeliveryUpdates,
        pushPickupUpdates,
        newOffers,
        allowSms,
        allowEmail,
      };
    },
    orderSets({ id }, { paging }, context) {
      return context.orderSet.getByCustomer(id, paging);
    },
    photo() {
      return microservices.customerProfilePictureEndpoint;
    },
    lastOrderSet({ id }, args, context) {
      return context.orderSet.getCustomerLastOrder(id);
    },
    couponsAvailable({ id, email }, { paging, countryId }, context) {
      return context.coupon.getCouponsAvailableByCustomer(
        id,
        email,
        countryId,
        paging
      );
    },
    async pastOrderSets({ id }, { paging }, context) {
      return context.orderSet.getPastOrderSetsByCustomer(id, paging);
    },
    async getOrderSetsByCustomer({ id }, { countryId, paging }, context) {
      return context.orderSet.getOrderSetsByCustomerNew(id, countryId, paging);
    },
    async getOrderSetsByCustomerNew({ id }, { scanedPastYear, countryId, paging }, context) {
      return context.orderSet.getOrderSetsByCustomerNew(id, scanedPastYear, countryId, paging);
    },
    async getStoreOrderSetsByCustomer({ id }, { scanedPastYear, countryId, paging }, context) {
      return context.storeOrderSet.getStoreOrderSetsByCustomer(id, scanedPastYear, countryId, paging);
    },
    upcomingOrderSets({ id }, { paging }, context) {
      return context.orderSet.getUpcomingOrderSetsByCustomer(id, paging);
    },
    pastStoreOrders({ id }, { paging }, context) {
      return context.storeOrder.getPastStoreOrdersByCustomer(id, paging);
    },
    upcomingStoreOrders({ id }, { paging }, context) {
      return context.storeOrder.getUpcomingStoreOrdersByCustomer(id, paging);
    },
    async pastCofeOrders({ id }, { paging }, context) {
      const pastOrderSets = map(
        await context.orderSet.getPastOrderSetsByCustomer(id, paging),
        order => ({ ...order, __typeOf: 'OrderSet', created: order.createdAt })
      );

      const pastStoreOrderSets = map(
        await context.storeOrderSet.getPastStoreOrdersByCustomer(id, paging),
        order => ({ ...order, __typeOf: 'StoreOrderSet' })
      );
      const orders = sortBy([...pastOrderSets, ...pastStoreOrderSets], o =>
        moment(o.created).unix()
      );

      return reverse(orders);
    },
    async upcomingCofeOrders({ id }, { paging }, context) {
      const upcomingOrderSets = map(
        await context.orderSet.getUpcomingOrderSetsByCustomer(id, paging),
        order => ({ ...order, __typeOf: 'OrderSet', created: order.createdAt })
      );

      const upcomingStoreOrderSets = map(
        await context.storeOrderSet.getUpcomingStoreOrdersByCustomer(
          id,
          paging
        ),
        order => ({ ...order, __typeOf: 'StoreOrderSet' })
      );

      const orders = sortBy(
        [...upcomingOrderSets, ...upcomingStoreOrderSets],
        o => moment(o.created).unix()
      );

      return reverse(orders);
    },

    creditBalance({ id }, { currencyId }, context) {
      return context.loyaltyTransaction.getBalanceByCustomer(id, currencyId);
    },
    loyaltyOrders({ id }, { paging }, context) {
      return context.loyaltyOrder.getByCustomer(id, paging);
    },
    async totalOrders({ id }, args, context) {
      const { totalOrders } = await context.customerStats.getByCustomer(id);
      return totalOrders;
    },
    async totalKdSpent({ id }, args, context) {
      const { totalKdSpent } = await context.customerStats.getByCustomer(id);
      return totalKdSpent;
    },
    async totalOrderSets({ id }, args, context) {
      const orderSetCount = await context.orderSet.getCountByCustomer(id);
      return orderSetCount;
    },
    async totalOrderSetKdSpents({ id }, args, context) {
      const totalKdSpent = await context.orderSet.getTotalKdSpentByCustomer(id);
      return totalKdSpent;
    },
    currentRewardProgramsDetails({ id }, { brandId }, context) {
      return context.customer.getCurrentRewardProgramsDetails(id, brandId);
    },
    defaultCurrency() {
      return 'KWD';
    },
    isGuest(root) {
      return isGuestCustomer(root);
    },
    wallet({ id }, args, context) {
      return context.customer.getWallet(id);
    },
    cardTokens({ id }, args, context) {
      return context.paymentService.getCustomerSavedCardTokens({
        paymentProvider: paymentProvider.CHECKOUT,
        customerId: id,
      });
    },
    referredBy({ id }, args, context) {
      return context.referral.customerReferredBy(id);
    },
    referrals({ id }, args, context) {
      return context.referral.referredCustomers(id);
    },
    signupPromo({ signupPromoId }, args, context) {
      return context.signupPromo.getById(signupPromoId);
    },
    async storeOrderSets({ id }, { paging, filters = {} }, context) {
      return context.storeOrderSet.getAllPaidPaged(paging, {
        ...filters,
        customerId: id,
      });
    },
    async sentGiftCards({ id }, { paging }, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.giftCard
            .getBy('sender_id', id, paging)
            .orderBy('created', 'desc'),
          'imageUrl'
        ),
        'name'
      );
    },
    async receivedGiftCards({ id }, { paging }, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.giftCard
            .getBy('receiver_id', id, paging)
            .orderBy('redeemed_on', 'desc'),
          'imageUrl'
        ),
        'name'
      );
    },
    async isDisabled({ id }, args, context) {
      const authCustomer = await context.authCustomer.getById(id);
      return authCustomer ? Boolean(authCustomer.isDisabled) : false;
    },
    async getStoreOrdersByCustomer({ id }, { countryId, paging }, context) {
      return context.storeOrder.getStoreOrdersByCustomerNew(id, countryId, paging);
    },
    async getAllOrdersByCustomer({ id }, { scanedPastYear }, context) {
      const pastOrderSets = map(
        await context.orderSet.getOrderSetsByCustomer(id, scanedPastYear),
        order => ({ ...order, __typeOf: 'OrderSetCard', created: order.createdAt })
      );

      const pastStoreOrderSets = map(
        await context.storeOrder.getStoreOrdersByCustomer(id, scanedPastYear),
        order => ({ ...order, __typeOf: 'StoreOrderCard' })
      );
      const orders = sortBy([...pastOrderSets, ...pastStoreOrderSets], o =>
        moment(o.created).unix()
      );

      return reverse(orders);
    },
    password(root, args, context) {
      context.kinesisLogger
        .sendLogEvent(
          {
            request: context.req.body,
            user: context.req.user,
          },
          kinesisEventTypes.customerPasswordRequested
        )
        .catch(err => console.log(err));
      return '*****';
    },
    async subscriptionOrders({ id }, { countryId }, context) {
      return context.cSubscriptionOrder.getSubscriptionOrderByCustomerId(id, countryId);
    },
    async subscriptionOrdersForAdmin({ id }, args, context) {
      return context.cSubscriptionCustomer.getByCustomerId(id, null);
    },
    fullName({firstName, lastName}, args, context){
      return [firstName, lastName].join(' ');
    }
  },
};
