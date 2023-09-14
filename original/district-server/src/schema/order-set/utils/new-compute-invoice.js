const {
  rewardTierPerkType,
  rewardTierPerkApplyType,
  rewardStatus,
  couponType,
  //orderTypes,
  menuItemType,
  firstOrdersType,
  invoiceComponentType,
  promoType,
  couponDetailUsedOn,
  paymentStatusName,
  orderSetStatusNames,
  paymentStatusOrderType,
  transactionAction,
  transactionType,
  loyaltyTransactionType,
  orderSetError,
  orderSetSource,
  statusTypes,
  countryConfigurationKeys,
  ServiceFeeMappingForFulfillments,
  customerAnalyticsEvents,
} = require('../../root/enums');
const { orderCreateError, orderFulfillmentTypes } = require('../enums');
const { first, pick, sortBy, get, flatten, filter, findIndex, isEmpty, camelCase } = require('lodash');
const Money = require('../../../lib/currency');
const { paymentSchemes } = require('../../../payment-service/enums');
const {
  addLocalizationField,
  isBuildBefore,
  isAndroid,
  isIOS,
  consumePerk,
  cloneObject,
  generateShortCode,
  now,
  hashObject,
} = require('../../../lib/util');
const {
  isProd,
  order: orderConfig,
  invoiceCachingTtlInSeconds,
} = require('../../../../config');
const moment = require('moment');
const { paymentProviders } = require('../../../payment-service/enums');
const redis = require('../../../../redis');
const { brandLocationStoreStatusFull } = require('../../brand-location/enums');
const { branchArrivingTimeListError } = require('../../arriving-time/enums');
const SlackWebHookManager = require('../../slack-webhook-manager/slack-webhook-manager');
const { publishEvent } = require('../../../lib/event-publisher');
const { Topic } = require('../../../lib/event-publisher/enums');


class ComputeInvoice {
  constructor(context, input) {
    this.context = context;
    this.stringInput = JSON.stringify(input);
    this.input = input;
    this.basketId = input.basketId || '';
    this.items = input.items;
    this.brandLocationId = input.brandLocationId;
    this.paymentMethod = input.paymentMethod;
    this.customerId = this.context.auth.id;
    this.isSubscriptionUsable = false;
    this.subscriptionIds = [];
    this.subscribableItems = [];
    this.subscriptionUsedCupsCount = 0;
    this.subscriptionDetails = [];
    this.rewardPerks = input.usePerks || [];
    this.fulfillment = input.fulfillment;
    this.couponId = input.couponId;
    this.giftCardIds = input.giftCardIds || [];
    this.useCredits = input.useCredits || false;
    this.src = input.src || orderSetSource.MOBILE;
    this.allowedPaymentSchemesForSiri = [paymentSchemes.CASH, paymentSchemes.SAVED_CARD];
    this.unusableCouponInvoiceComponentTypes = [invoiceComponentType.DISCOVERY_CREDITS];
    this.errors = [];
    this.selectedArrivalTime = input.selectedArrivalTime != null ? input.selectedArrivalTime : null;
    this.selectFields = {
      brandLocation: [
        'id',
        'name',
        'currency_id',
        'brand_id',
        'accepting_orders',
        'accepts_cash',
        'time_zone_identifier',
      ],
      brand: ['express_delivery_fee', 'delivery_fee', 'name', 'minimum_delivery_order_amount', 'minimum_express_delivery_order_amount'],
      country: ['id', 'vat', 'is_referral_active', 'iso_code'],
      currency: [
        'id',
        'decimal_place',
        'lowest_denomination',
        'iso_code',
        'name',
        'symbol',
        'symbol_ar',
        'symbol_tr',
      ],
      coupon: [
        'id',
        'max_limit',
        'type',
        'only_first_orders_for',
        'only_first_orders',
        'first_orders_redemption_limit',
        'customer_group_id',
        'referral_coupon',
      ],
      couponDetail: ['id', 'type', 'amount'],
      reward: ['id', 'conversion_rate'],
      customerTier: ['reward_tier_id'],
      rewardTierPerk: ['type', 'value'],
      menuItem: ['id', 'type', 'name', 'name_ar', 'name_tr', 'photo'],
      menuItemOption: [
        'id',
        'price',
        'value',
        'value_ar',
        'value_tr',
        'compare_at_price',
      ],
      customer: ['referral_code', 'email', 'preferred_language', 'phone_number'],
      customerPerk: ['type', 'total'],
      customerPerkView: ['perks_type', 'perks_value', 'created', 'discount_limit', 'reward_tier_id'],
    };
    this.brandLocation = null;
    this.country = null;
    this.currency = null;
    this.coupon = { isCashbackCoupon: false };
    this.couponDetails = [];
    this.couponPerks = [];
    this.consumedPerks = [];
    this.tierDiscountMultiplier = 1;
    this.tierDiscountLimit = 0;
    this.subscriptionAmount = 0;
    this.rewardPerkFreeAmount = 0;
    this.rewardDiscountAmount = 0;
    // sum of reward discount and free food/drink
    this.rewardAmount = 0;

    this.couponPerkFreeAmount = 0;
    // sum of coupon discount and free food/drink
    this.couponAmount = 0;

    // prices of all the items without any discount
    this.subtotal = 0;
    // prices of the items after reward free food/drink and discount
    this.firstIntermediateSubtotal = 0;
    this.fee = 0;
    this.calculatedPrice = null;
    this.serviceFee = {};
    this.serviceFeeAmount = 0;
    this.isServiceFeeActive = false;
  }

  async init() {
    this.cacheResult = await this.getInvoiceCache();
    // if order has been already processed immediately raise error
    if (this.cacheResult && this.cacheResult.isOrderCreated) {
      this.errors.push(orderCreateError.ORDER_ALREADY_PROCESSED);
      throw this.errors;
    }
    if (!this.brandLocationId) {
      this.errors.push(orderCreateError.INVALID_BRAND_LOCATION);
      throw this.errors;
    }
    this.brandLocation = await this.context.brandLocation
      .selectFields(this.selectFields.brandLocation)
      .where('id', this.brandLocationId)
      .then(first);
    this.brand = await this.context.brand
      .selectFields(this.selectFields.brand)
      .where('id', this.brandLocation.brandId)
      .andWhere('status', statusTypes.ACTIVE)
      .then(first);
    if (!this.brand) {
      this.errors.push(orderCreateError.INVALID_BRAND);
      throw this.errors;
    }
    this.country = await this.context.country
      .selectFields(this.selectFields.country)
      .where('currency_id', this.brandLocation.currencyId)
      .then(first);
    this.currency = await this.context.currency
      .selectFields(this.selectFields.currency)
      .where('id', this.brandLocation.currencyId)
      .then(first);
    const subs = await this.context.cSubscriptionCustomerTransaction.isSubscriptionUsable(this.customerId, this.brandLocation.brandId);
    if (subs) {
      this.isSubscriptionUsable = subs.usable;
      this.subscriptionIds = subs.subscriptionIds;
    }
    const configurationKeys = [
      countryConfigurationKeys.SERVICE_FEE_ENABLED,
      countryConfigurationKeys.SERVICE_FEE_MAXLIMIT_PICKUP,
      countryConfigurationKeys.SERVICE_FEE_PERCENTAGE_PICKUP,
      countryConfigurationKeys.SERVICE_FEE_MAXLIMIT_DELIVERY,
      countryConfigurationKeys.SERVICE_FEE_PERCENTAGE_DELIVERY,
      countryConfigurationKeys.SERVICE_FEE_MAXLIMIT_EXPRESS_DELIVERY,
      countryConfigurationKeys.SERVICE_FEE_PERCENTAGE_EXPRESS_DELIVERY,
      countryConfigurationKeys.SERVICE_FEE_MAXLIMIT_CAR,
      countryConfigurationKeys.SERVICE_FEE_PERCENTAGE_CAR
    ];

    const configurations = await this.context.countryConfiguration.getByKeys(
      configurationKeys,
      this.country.id
    );

    this.isServiceFeeActive = configurations.find(item => item
      .configurationKey == countryConfigurationKeys.SERVICE_FEE_ENABLED);

    if (!this.isServiceFeeActive) {
      this.isServiceFeeActive = false;
    } else {
      this.isServiceFeeActive = this.isServiceFeeActive.configurationValue;
    }
    this.isServiceFeeActive = JSON.parse(this.isServiceFeeActive);

    if (this.isServiceFeeActive) {
      const serviceFeeKey = ServiceFeeMappingForFulfillments[this.fulfillment.type.toUpperCase()];

      this.serviceFee.percentage = configurations.find(item => item
        .configurationKey == countryConfigurationKeys[serviceFeeKey.PERCENTAGE]);
      this.serviceFee.percentage = Number(this.serviceFee?.percentage?.configurationValue);

      this.serviceFee.maxLimit = configurations.find(item => item
        .configurationKey == countryConfigurationKeys[serviceFeeKey.MAXLIMIT]);
      this.serviceFee.maxLimit = Number(this.serviceFee?.maxLimit?.configurationValue);

      if (!this.serviceFee.percentage || !this.serviceFee.maxLimit) {
        this.isServiceFeeActive = false;
        SlackWebHookManager.sendTextAndErrorToSlack(
          `Service Fee is active for country:${this.country.id} but no configurations for
          ${this.fulfillment.type.toUpperCase()} was found. so disabling Service Fee for this Order `
        );
      }
    }

    // MenuItem - Disable Discovery Credit relation
    if (this.items && this.items.length > 0) {
      const menuItemIds = this.items.map(t => t.itemId);
      if (menuItemIds && menuItemIds.length > 0) {
        const menuItems = await this.context.menuItem.getByIds(menuItemIds);
        if (menuItems && menuItems.length > 0) {
          this.isExistDisableDiscoveryCreditInMenuItems = menuItems.some(t => t.disableDiscoveryCredit === true);
        }
      }
    }
  }
  applyServiceFees(subTotal) {
    let calculatedServiceFee = (subTotal / 100) * this.serviceFee.percentage;
    calculatedServiceFee = this.getMoney(calculatedServiceFee);
    this.serviceFeeAmount = (calculatedServiceFee.value > this.serviceFee.maxLimit) ? this.getMoney(this.serviceFee.maxLimit) : calculatedServiceFee;
    return this.serviceFeeAmount;
  }
  getCostReductionPerk(couponDetails) {
    const costReductionPerkTypes = [
      couponType.PERCENTAGE,
      couponType.FLAT_AMOUNT,
    ];
    return couponDetails.find(couponDetail =>
      costReductionPerkTypes.includes(couponDetail.type)
    );
  }
  getFreePerks(couponDetails) {
    const freePerkTypes = [
      couponType.FREE_DELIVERY,
      couponType.FREE_DRINK,
      couponType.FREE_FOOD,
    ];
    return couponDetails
      .filter(couponDetail => freePerkTypes.includes(couponDetail.type))
      .map(couponDetail => ({
        coupon: true,
        type: couponDetail.type,
        quantity: parseInt(couponDetail.amount, 10),
      }));
  }

  getMoney(value) {
    return new Money(
      value,
      this.currency.decimalPlace,
      this.currency.lowestDenomination
    );
  }
  // this function originally in coupon/model.js and its name is fetchDiscount
  // after the original function really deprecate, we can move this to place
  // where it is belong
  async getCouponDiscount({
    customerId,
    coupon,
    costReductionPerk,
    subtotal,
    perksAmount = 0,
    useCredits,
    currency,
  }) {
    if (!coupon || (!costReductionPerk && perksAmount === 0)) {
      return { amount: 0, percentage: 0 };
    }

    if (useCredits && coupon.type === promoType.CASHBACK) {
      const { promotioanalCredits } = await this.context.coupon.allCredits(
        customerId,
        currency.id
      );
      subtotal = Math.max(Number(subtotal) - Number(promotioanalCredits), 0);
    }

    // get cost reduction coupon detail
    let percentage = 0;
    const limit = parseFloat(coupon.maxLimit);

    if (!costReductionPerk) {
      if (perksAmount > 0) {
        // incorporate perks amount in percentage of discount
        const discount = perksAmount;
        if (limit > 0 && limit < discount) {
          return { amount: limit, percentage };
        }
        if (discount > subtotal) {
          return { amount: subtotal, percentage };
        }
        return { amount: discount, percentage };
      }

      return { amount: 0, percentage: 0 };
    }
    if (costReductionPerk.type === couponType.PERCENTAGE) {
      percentage = parseFloat(costReductionPerk.amount);
      // incorporate perks amount in percentage of discount
      const discount = subtotal * (percentage / 100) + perksAmount;
      if (limit > 0 && limit < discount) {
        return { amount: limit, percentage };
      }
      if (discount > subtotal) {
        return { amount: subtotal, percentage };
      }
      return { amount: discount, percentage };
    }
    // incorporate perks amount in percentage of discount
    const totalDiscount = Number(costReductionPerk.amount) + perksAmount;
    if (
      totalDiscount > subtotal &&
      (!costReductionPerk.type || costReductionPerk.type === promoType.REGULAR)
    ) {
      return { amount: Number(subtotal), percentage };
    }
    return { amount: totalDiscount, percentage };
  }

  // this function originally in discovery-credit/model.js and its name
  // is eligibleDiscoveryCreditForBrand after the original function really
  // deprecate, we can move this to belong place
  async eligibleDiscoveryCreditsForBrand({
    customerId,
    countryId,
    brandId,
    currencyId,
    total,
  }) {
    if (
      !customerId ||
      !countryId ||
      !brandId ||
      !currencyId ||
      Number(total) <= 0
    ) {
      return { discoveryCreditUsed: 0, isDiscoveryCreditsUsable: false };
    }
    if (this.isExistDisableDiscoveryCreditInMenuItems === true) {
      return { discoveryCreditUsed: 0, isDiscoveryCreditsUsable: false };
    }
    const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCountryId(
      customerId,
      countryId
    );
    if (discoveryCredit) {
      const redemptionCount = await this.context.discoveryCreditRedemption.countUsedByBrand(
        discoveryCredit.id,
        brandId
      );

      // wallet must be created before
      const currentAccount = await this.context.walletAccount.getByCustomerIdAndCurrencyId(
        customerId,
        currencyId
      );

      if (
        currentAccount &&
        Number(currentAccount.discoveryAmount) >=
        Number(discoveryCredit.amountPerOrder) &&
        Number(redemptionCount) < Number(discoveryCredit.noOfOrdersPerBrand) &&
        // elgible if total order value is greater than/equal min order value
        Number(total) >= Number(discoveryCredit.minOrderAmount) &&
        // elgible if total order value is greater than/equal consumeable amount per order
        Number(total) >= Number(discoveryCredit.amountPerOrder)
      ) {
        return {
          discoveryCreditUsed: Number(discoveryCredit.amountPerOrder),
          isDiscoveryCreditsUsable: true,
        };
      }
      // customer can use discovery credits
      // but customer have to increase order amount
      if (
        Number(total) < Number(discoveryCredit.minOrderAmount) &&
        Number(total) < Number(discoveryCredit.amountPerOrder)
      ) {
        return { discoveryCreditUsed: 0, isDiscoveryCreditsUsable: true };
      }
    }
    return { discoveryCreditUsed: 0, isDiscoveryCreditsUsable: false };
  }

  calculateCredit(customerBalance, total) {
    let credits;
    // Validate that the customer has enought credit
    if (Number(customerBalance) < Number(total)) {
      credits = Number(customerBalance);
    } else {
      credits = Number(total);
    }
    return credits;
  }

  calculateAmountDue(customerBalance, total) {
    let amountDue;
    if (Number(customerBalance) < Number(total)) {
      amountDue = Number(total) - Number(customerBalance);
    } else {
      amountDue = 0.0;
    }

    return amountDue;
  }

  calculateGCCredit(gcBalance, due) {
    let credits;
    // Validate that the customer has enought credit
    if (Number(gcBalance) < Number(due)) {
      credits = Number(gcBalance);
    } else {
      credits = Number(due);
    }
    return credits;
  }

  calculateGCAmountDue(gcBalance, due) {
    let amountDue;
    if (Number(gcBalance) < Number(due)) {
      amountDue = Number(due) - Number(gcBalance);
    } else {
      amountDue = 0.0;
    }

    return amountDue;
  }

  paymentMethodValid(paymentMethod) {
    if (
      paymentMethod &&
      Object.keys(paymentSchemes).includes(paymentMethod.paymentScheme)
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
  }
  async checkItems() {
    if (!this.items || (this.items && this.items.length <= 0)) {
      this.errors.push(orderCreateError.INVALID_MENU_ITEM);
      throw this.errors;
    }
    const priceRules = await this.context.brandLocationPriceRule.getByBrandLocation(
      this.brandLocationId
    );
    const { itemIds, selectedOptions } = this.items.reduce(
      ({ itemIds, selectedOptions }, item) => {
        if (item.quantity < 1) {
          this.errors.push(orderCreateError.ZERO_QUANTITY_REQUESTED);
          throw this.errors;
        }
        let isDuplicateOption = false;
        item.selectedOptions.map((option, i) => {
          if (i !== findIndex(item.selectedOptions, selectedOption => {
            return option.optionId === selectedOption.optionId;
          })) isDuplicateOption = true;
        });
        if (isDuplicateOption) {
          this.errors.push(orderCreateError.MENU_ITEM_OPTION_DUBLICATE_IN_ITEM);
          throw this.errors;
        }
        Object.assign(item, {
          freeBySubscription: 0,
          consumeQuantitybySubscription: 0,
          freeByReward: 0,
          consumeQuantitybyReward: 0,
          freeByCoupon: 0,
          consumeQuantitybyCoupon: 0,
          couponDiscountAmount: this.getMoney(0),
          price: item.selectedOptions.reduce(
            (total, option) => total.add(option.price),
            this.getMoney(0)
          ),
        });
        return {
          itemIds: [...itemIds, item.itemId],
          selectedOptions: [...selectedOptions, ...item.selectedOptions],
        };
      },
      { itemIds: [], selectedOptions: [] }
    );
    const itemsFromDatabase = await this.context.menuItem
      .selectFields(this.selectFields.menuItem)
      .whereIn('id', itemIds).andWhere('status', 'ACTIVE');
    for (const item of this.items) {
      const itemFromDatabase = itemsFromDatabase.find(
        ({ id }) => id === item.itemId
      );
      if (!itemFromDatabase) {
        this.errors.push(orderCreateError.INVALID_MENU_ITEM);
        throw this.errors;
      } else {
        const tempSelectedOptions = await this.context.menuItemOption.getMenuOptionInfoWithOptionSets(item.itemId, item.selectedOptions.map(({ optionId }) => optionId));
        let optionNumber = 0;
        for (const tempSelectedOption of tempSelectedOptions) {
          if (tempSelectedOption.single === true && tempSelectedOption.optionId.length > 1) {
            this.errors.push(orderCreateError.MULTIBLE_OPTION_CAN_NOT_SELECTED);
            throw this.errors;
          }
          optionNumber += tempSelectedOption.optionId.length;
        }
        if (item.selectedOptions.length !== optionNumber) {
          this.errors.push(orderCreateError.OPTION_CAN_NOT_FOUND_IN_ITEM);
          throw this.errors;
        }
      }
      Object.assign(
        item,
        pick(itemFromDatabase, ['type', 'name', 'nameAr', 'nameTr', 'photo'])
      );
    }
    const selectedOptionsFromDatabase = await this.context.menuItemOption
      .selectFields(this.selectFields.menuItemOption)
      .whereIn('id', selectedOptions.map(({ optionId }) => optionId));
    for (const selectedOption of selectedOptions) {
      const selectedOptionFromDatabase = selectedOptionsFromDatabase.find(
        ({ id }) => id === selectedOption.optionId
      );
      if (!selectedOptionFromDatabase) {
        this.errors.push(orderCreateError.INVALID_MENU_ITEM_OPTION);
        throw this.errors;
      }
      const currentPrice = this.context.brandLocation.calculatePriceViaPriceRule(
        priceRules,
        selectedOptionFromDatabase
      );
      const databasePrice = this.getMoney(currentPrice)
        .round()
        .value.toFixed(this.currency.decimalPlace);
      if (parseFloat(selectedOption.price) !== parseFloat(databasePrice)) {
        this.errors.push(orderCreateError.INVALID_MENU_ITEM_OPTION_PRICE);
        throw this.errors;
      }
      Object.assign(
        selectedOption,
        pick(selectedOptionFromDatabase, [
          'value',
          'valueAr',
          'valueTr',
          'compareAtPrice',
        ])
      );
    }
  }
  async getReward() {
    if (this.reward) return this.reward;
    this.reward = await this.context.reward
      .selectFields(this.selectFields.reward)
      .join('brands_rewards', 'brands_rewards.reward_id', 'rewards.id')
      .where('brands_rewards.brand_id', this.brandLocation.brandId)
      .where('rewards.status', rewardStatus.ACTIVE)
      .orderBy('rewards.created', 'desc')
      .then(first);
    return this.reward;
  }
  async getOngoingPerks() {
    if (this.ongoingPerks) return this.ongoingPerks;
    const reward = await this.getReward();
    if (!reward) {
      this.ongoingPerks = [];
      return this.ongoingPerks;
    }
    const query = this.context.customerPerk
      .selectFields(
        this.selectFields.customerPerkView,
        this.context.customerPerk.viewName,
      )
      .where('customer_id', this.customerId)
      .where('reward_id', reward.id)
      .where('perks_apply_type', rewardTierPerkApplyType.ONGOING)
      .where('perks_type', rewardTierPerkType.DISCOUNT);
    const customerCurrentTier = await this.context.customerTier.getCurrentTier(this.customerId, reward.id);
    if (customerCurrentTier && customerCurrentTier.rewardTierId) {
      query.where('reward_tier_id', customerCurrentTier.rewardTierId);
    }
    const ongoingPerks =
      (await query) || [];
    const maxTierCreatedTime = Math.max(
      ...ongoingPerks.map(ongoingPerk => {
        ongoingPerk.type = ongoingPerk.perksType;
        ongoingPerk.value = ongoingPerk.perksValue;
        return moment(ongoingPerk.created).valueOf();
      })
    );
    this.ongoingPerks = ongoingPerks.filter(
      ({ created }) => moment(created).valueOf() === maxTierCreatedTime
    );
    return this.ongoingPerks;
  }

  addSubscriptionUsedInfoAndDetail(subscriptionUsedInfo) {
    const value = this.getMoney(subscriptionUsedInfo.value);
    const existingDetail = this.subscriptionDetails.find(
      ({ id }) => subscriptionUsedInfo.id === id
    );
    if (existingDetail) {
      existingDetail.usedCupsCount += subscriptionUsedInfo.usedCupsCount;
      existingDetail.value = value
        .add(this.getMoney(existingDetail.value))
        .round()
        .value;
      const existingItem = existingDetail.items.find(
        ({ id }) => subscriptionUsedInfo.itemId === id
      );
      if (existingItem) {
        existingItem.usedCupsCount += subscriptionUsedInfo.usedCupsCount;
      } else {
        existingDetail.items.push({
          id: subscriptionUsedInfo.itemId,
          value: value.round().value,
          usedCupsCount: subscriptionUsedInfo.usedCupsCount,
        });
      }
    } else {
      this.subscriptionDetails.push({
        id: subscriptionUsedInfo.id,
        value: value.round().value,
        usedCupsCount: subscriptionUsedInfo.usedCupsCount,
        items: [
          {
            id: subscriptionUsedInfo.itemId,
            value: value.round().value,
            usedCupsCount: subscriptionUsedInfo.usedCupsCount,
          }
        ],
      });
    }
  }

  async calculatePrice() {
    if (this.cacheResult) {
      return this.cacheResult.calculatedPrice;
    }
    // reward ongoing perks
    const ongoingPerks = await this.getOngoingPerks();
    let isAllItemFree = true;
    let discountEnable = null;
    ongoingPerks.forEach(ongoingPerk => {
      if (parseFloat(ongoingPerk.value) === 100) {
        this.tierDiscountMultiplier = 0;
      } else {
        this.tierDiscountMultiplier = (100 - ongoingPerk.value) / 100;
      }
      if (ongoingPerk.type == rewardTierPerkType.DISCOUNT) {
        this.tierDiscountLimit = ongoingPerk.discountLimit;
      }
      discountEnable = {
        type: ongoingPerk.type,
        quantity: parseFloat(ongoingPerk.value),
        tierDiscountMultiplier: this.tierDiscountMultiplier,
        ...((ongoingPerk.type == rewardTierPerkType.DISCOUNT) && { tierDiscountLimit: ongoingPerk.discountLimit })
      };
      /*
      this.consumedPerks.push({
        type: ongoingPerk.type,
        quantity: parseFloat(ongoingPerk.value),
        tierDiscountMultiplier: this.tierDiscountMultiplier,
      });
      */
    });
    this.items.sort((a, b) => a.price.intValue - b.price.intValue);

    if (this.subscribableItems.length > 0) {
      this.subscribableItems.forEach(item => {
        item.consumeQuantitybySubscription = item.quantitySubscribable;
        item.freeBySubscription = item.quantitySubscribable;
        const value = this.getMoney(
          item.priceSubscription
        )
          .mult(item.freeBySubscription)
          .round()
          .value;
        this.subscriptionAmount += value;
        this.addSubscriptionUsedInfoAndDetail({
          id: item.subscriptionId,
          value,
          usedCupsCount: item.freeBySubscription,
          itemId: item.itemId
        });
      });
    }
    // APPLY REWARD PERKS(FREE)
    if (this.rewardPerks.length > 0) {
      this.items.forEach(item => {
        let perk;
        switch (item.type) {
          case menuItemType.FOOD:
            perk = this.rewardPerks.find(
              t => t.type === rewardTierPerkType.FREE_FOOD
            );
            break;
          case menuItemType.DRINK:
            perk = this.rewardPerks.find(
              t => t.type === rewardTierPerkType.FREE_DRINK
            );
            break;
          default:
            perk = null;
        }
        if (perk) {
          const itemQuantityAfterSubscription = item.quantity - item.freeBySubscription;
          item.freeByReward = parseFloat(perk.quantity);
          // set perk free quantity for line item
          if (itemQuantityAfterSubscription >= item.freeByReward) {
            item.consumeQuantitybyReward = item.freeByReward;
          } else {
            item.consumeQuantitybyReward = itemQuantityAfterSubscription;
            // we have more free items so only ckItemQuantity number of drinks we are redeeming
            item.freeByReward = itemQuantityAfterSubscription;
          }
          this.rewardPerkFreeAmount +=
            item.consumeQuantitybyReward * item.price.value;
          this.rewardPerks = consumePerk(
            perk.type,
            perk.coupon,
            item.consumeQuantitybyReward,
            this.rewardPerks,
            this.consumedPerks
          );
        }
        // apply reward discount on each quantity
      });
    }

    // console.log('perks///', perks);
    // APPLY COUPON PERKS(FREE) AND DISCOUNT
    if (this.couponId) {
      this.couponDetails = await this.context.couponDetail
        .selectFields(this.selectFields.couponDetail)
        .where('coupon_id', this.couponId);
      this.couponPerks = this.getFreePerks(this.couponDetails);
      this.coupon.isCashbackCoupon = this.coupon.type === promoType.CASHBACK;
    }
    if (this.couponPerks.length > 0) {
      this.items.forEach(item => {
        let perk;
        switch (item.type) {
          case menuItemType.FOOD:
            perk = this.couponPerks.find(
              t => t.type === rewardTierPerkType.FREE_FOOD
            );
            break;
          case menuItemType.DRINK:
            perk = this.couponPerks.find(
              t => t.type === rewardTierPerkType.FREE_DRINK
            );
            break;
          default:
            perk = null;
        }
        // quantities left after free items
        if (perk) {
          const itemQuantityAfterReward = item.quantity - item.freeBySubscription - item.freeByReward;
          item.freeByCoupon = parseFloat(perk.quantity);
          // set perk free quantity for line item
          if (itemQuantityAfterReward >= item.freeByCoupon) {
            item.consumeQuantitybyCoupon = item.freeByCoupon;
          } else {
            item.consumeQuantitybyCoupon = itemQuantityAfterReward;

            // we have more free items so only ckItemQuantity number of drinks we are redeeming
            item.freeByCoupon = itemQuantityAfterReward;
          }
          if (this.tierDiscountMultiplier < 1) {
            this.couponPerkFreeAmount +=
              item.consumeQuantitybyCoupon *
              (item.price.value -
                (item.price.value -
                  item.price.value * this.tierDiscountMultiplier));
          } else {
            this.couponPerkFreeAmount +=
              item.consumeQuantitybyCoupon * item.price.value;
          }

          this.couponPerks = consumePerk(
            perk.type,
            perk.coupon,
            item.consumeQuantitybyCoupon,
            this.couponPerks,
            this.consumedPerks
          );
        }
      });
    }

    // total for all the items exluding free drinks or foods of reward perks
    this.subtotal = this.items.reduce(
      (total, item) => item.price.mult(item.quantity).add(total),
      this.getMoney(0)
    );

    // service is applicapable on subtotal before any discounts
    if (this.isServiceFeeActive) {
      this.serviceFeeAmount = this.getMoney(0);
      this.serviceFeeAmount = this.getMoney(this.applyServiceFees(this.subtotal.value)).value;
    }


    this.subscriptionAmount = this.getMoney(this.subscriptionAmount);
    this.firstIntermediateSubtotal = this.subtotal.sub(this.subscriptionAmount);

    // get reward perk free food/drink amount
    this.rewardPerkFreeAmount = this.getMoney(this.rewardPerkFreeAmount);
    this.rewardDiscountAmount = this.getMoney(0);
    // calcualted ongoing reward discount on each item
    if (this.tierDiscountMultiplier < 1) {
      this.items.forEach(item => {
        const quantityWillBePaidWithFullPrice = item.quantity
          - item.freeBySubscription
          - item.freeByReward;
        let itemTotalPrice = item.price.mult(quantityWillBePaidWithFullPrice);
        // item price can be higher than 0 if add-ons selected
        // in this case we have to consider add-ons price inside
        // item price
        if (
          this.isSubscriptionUsable &&
          item.freeBySubscription > 0
          && item.priceAfterSubscription && item.priceAfterSubscription.value > 0
        ) {
          itemTotalPrice = itemTotalPrice.add(
            item.priceAfterSubscription
              .mult(item.freeBySubscription)
              .round()
          );
        }
        this.rewardDiscountAmount = this.rewardDiscountAmount.add(itemTotalPrice.sub(
          itemTotalPrice.mult(this.tierDiscountMultiplier)
        ));
        isAllItemFree = itemTotalPrice.value > 0 ? false : isAllItemFree;
      });
      if (!isAllItemFree) {
        this.consumedPerks.push(discountEnable);
      }
    } else {
      this.rewardDiscountAmount = this.getMoney(0);
    }

    //apply Limit to rewardDiscountAmount if perk is DISCOUNT and it is greated then rewardTier Discount Limit
    if (discountEnable?.tierDiscountLimit && this.tierDiscountLimit > 0) {
      if (this.rewardDiscountAmount.value > this.tierDiscountLimit) {
        this.rewardDiscountAmount = this.getMoney(this.tierDiscountLimit);
      }
    }

    // sum of reward discount and free food/drink
    this.rewardAmount = this.rewardPerkFreeAmount.add(
      this.rewardDiscountAmount
    );

    // first intermediate sub total is subtracting reward perk free amount and reward discount from subtotal
    this.firstIntermediateSubtotal = this.firstIntermediateSubtotal.sub(this.rewardAmount);
    // get coupon perk free food/drink amount
    this.couponPerkFreeAmount = this.getMoney(this.couponPerkFreeAmount);
    // second immediate subtotal. after firstIntermediateSubtotal and then discount of coupon free food and drink
    // secondIntermediateSubtotal = firstIntermediateSubtotal.sub(
    //   couponPerkFreeAmount
    // );
    // find discount amount for firstIntermediateSubtotal
    this.discount = await this.getCouponDiscount({
      customerId: this.customerId,
      coupon: this.coupon,
      costReductionPerk: this.getCostReductionPerk(this.couponDetails),
      subtotal: this.firstIntermediateSubtotal.value,
      perksAmount: this.couponPerkFreeAmount.value,
      useCredits: this.useCredits,
      currency: this.currency,
    });
    this.discount.amount = this.getMoney(this.discount.amount);
    if (this.discount.amount > 0) {
      this.consumedPerks.push({
        type: 'COUPON',
        value: this.discount.amount,
      });
    }
    // sum of coupon discount and free food/drink
    // couponAmount = couponPerkFreeAmount.add(discount.amount);
    this.couponAmount = this.discount.amount;

    switch (this.fulfillment.type) {
      case orderFulfillmentTypes.DELIVERY:
        this.fee = this.brand.deliveryFee;
        break;
      case orderFulfillmentTypes.EXPRESS_DELIVERY:
        this.fee = this.brand.expressDeliveryFee;
        break;
      default:
        break;
    }

    this.fee = this.getMoney(this.fee);
    this.discountedFee = this.getMoney(this.fee);

    const freeDeliveryPerk =
      this.rewardPerks.find(t => t.type === rewardTierPerkType.FREE_DELIVERY) ||
      this.couponPerks.find(t => t.type === rewardTierPerkType.FREE_DELIVERY);

    let isAvailableFreeDeliveryPerk = false;
    if (freeDeliveryPerk && parseFloat(freeDeliveryPerk.quantity) > 0) {
      this.discountedFee = this.getMoney(0);
      isAvailableFreeDeliveryPerk = true;
      if (freeDeliveryPerk.coupon) {
        this.couponPerks = consumePerk(
          freeDeliveryPerk.type,
          freeDeliveryPerk.coupon,
          1,
          this.couponPerks,
          this.consumedPerks
        );
      } else {
        this.rewardPerks = consumePerk(
          freeDeliveryPerk.type,
          freeDeliveryPerk.coupon,
          1,
          this.rewardPerks,
          this.consumedPerks
        );
      }
    }
    let subtotalWithAllDiscounts;
    if (this.coupon.isCashbackCoupon) {
      subtotalWithAllDiscounts = this.subtotal.sub(this.subscriptionAmount.round()).sub(this.rewardAmount.round());
    } else {
      // Math.max here is in case direct substraction can produce negative values
      // except FREE_DELIVERY perk any other discount must not be applied for delivery fee
      subtotalWithAllDiscounts = this.getMoney(Math.max(
        this.subtotal.value - this.subscriptionAmount.round().value - this.rewardAmount.round().value - this.couponAmount.round().value, 0
      ));
      // subtotalWithAllDiscounts = this.subtotal
      //   .sub(this.rewardAmount.round())
      //   .sub(this.couponAmount.round());
    }

    // Math.max here is in case the discount was greater than the
    // subtotal + fee.
    const total = Math.max(
      subtotalWithAllDiscounts
        .add(
          isAvailableFreeDeliveryPerk
            ? this.discountedFee.round()
            : this.fee.round()
        )
        .round().value,
      0
    );

    const {
      discoveryCreditUsed,
      isDiscoveryCreditsUsable,
    } = await this.eligibleDiscoveryCreditsForBrand({
      brandId: this.brandLocation.brandId,
      countryId: this.country.id,
      currencyId: this.currency.id,
      customerId: this.customerId,
      total: this.coupon.isCashbackCoupon
        ? total - this.couponAmount.value
        : total,
    });
    const totalAfterDiscoveryCredits = total - discoveryCreditUsed;

    let creditsUsed = 0.0;
    let giftCardCreditsUsed = 0.0;
    let amountDue = totalAfterDiscoveryCredits;
    if (this.useCredits) {
      const customerBalance = await this.context.loyaltyTransaction.getBalanceByCustomer(
        this.customerId,
        this.currency.id
      );
      // console.log('customerBalance', customerBalance);
      creditsUsed = this.calculateCredit(
        customerBalance,
        totalAfterDiscoveryCredits
      );
      amountDue = this.calculateAmountDue(
        customerBalance,
        totalAfterDiscoveryCredits
      );
    }

    if (this.giftCardIds.length > 0) {
      const giftCardBalance = await this.context.giftCardTransaction.getGiftCardBalance(
        this.giftCardIds[0]
      );
      giftCardCreditsUsed = this.calculateGCCredit(giftCardBalance, amountDue);
      amountDue = this.calculateGCAmountDue(giftCardBalance, amountDue);
    }
    if (this.isServiceFeeActive) {
      amountDue = amountDue + this.serviceFeeAmount;
    }


    return {
      fee: isAvailableFreeDeliveryPerk
        ? this.discountedFee.round().value
        : this.fee.round().value,
      subtotal: this.subtotal.value,
      total,
      amountDue,
      creditsUsed,
      giftCardCreditsUsed,
      consumedPerks: this.consumedPerks,
      currencyId: this.currency.id,
      vat: this.country.vat,
      isCashbackCoupon: this.coupon.isCashbackCoupon,
      couponAmount: this.couponAmount.round().value,
      rewardAmount: this.rewardAmount.round().value,
      subscriptionAmount: this.subscriptionAmount.round().value,
      currency: this.currency,
      originalFee: this.fee.round().value,
      discoveryCreditUsed,
      isDiscoveryCreditsUsable,
      serviceFeeAmount: this.serviceFeeAmount
    };
  }

  async getCustomer() {
    if (this.customer) return this.customer;
    this.customer = await this.context.customer
      .selectFields(this.selectFields.customer)
      .where('id', this.customerId)
      .then(first);
    return this.customer;
  }

  async isCouponAvailable() {
    if (!this.couponId || this.cacheResult) return true;
    const { email, referralCode } = await this.getCustomer();
    this.coupon = await this.context.coupon.getAvailableCouponForAuthCustomer(
      this.couponId,
      email
    );
    if (
      !this.coupon ||
      (this.coupon.referralCoupon && !this.country.isReferralActive)
    ) {
      this.errors.push(orderCreateError.INVALID_COUPON);
      throw this.errors;
    }
    if (
      this.coupon.onlyFirstOrders &&
      this.coupon.customerRedemptionLimit > 0
    ) {
      // const customer = await this.context.customer.getById(customerId);
      // if (customer.referralCode === coupon.couponCode) {
      if (referralCode === this.coupon.couponCode) {
        this.errors.push(orderCreateError.INVALID_COUPON);
        throw this.errors;
      }
      const customerStats = await this.context.customerStats.getByCustomer(
        this.customerId
      );
      if (customerStats.totalOrders >= this.coupon.customerRedemptionLimit) {
        this.errors.push(orderCreateError.INVALID_COUPON);
        throw this.errors;
      }
    }
    if (
      this.coupon.customerGroupId &&
      !(await this.context.coupon.isValidForCustomerGroup(
        this.coupon.customerGroupId,
        this.customerId
      ))
    ) {
      this.errors.push(orderCreateError.INVALID_COUPON);
      throw this.errors;
    }

    if (
      this.coupon &&
      this.coupon.onlyFirstOrdersFor === firstOrdersType.BRAND
    ) {
      let stats = {};
      if (this.coupon.onlyFirstOrders === true) {
        stats = await this.context.customerStats.getByCustomerForBrand(
          this.customerId,
          this.brandLocation.brandId
        );
      } else if (this.coupon.onlyFirstOrders === false) {
        stats = await this.context.customerStats.getByCustomerForBrandUsingParticularCoupon(
          this.customerId,
          this.brandLocation.brandId,
          this.couponId
        );
      }

      if (
        stats &&
        stats.totalOrders >= Number(this.coupon.firstOrdersRedemptionLimit)
      ) {
        this.errors.push(orderCreateError.INVALID_COUPON);
        throw this.errors;
      }
    }
  }

  async customerCanUseRewardPerks() {
    const reward = await this.getReward();
    const availablePerks =
      (await this.context.customerPerk
        .selectFields(this.selectFields.customerPerk)
        .where('reward_id', reward.id)
        .where('customer_id', this.customerId)
        .orderBy('total', 'asc')
        .orderBy('updated', 'desc')) || [];
    if (availablePerks && availablePerks.length > 0
      && this.rewardPerks && this.rewardPerks.length > 0) {
      return this.rewardPerks.every(rewardPerk => {
        const availablePerk = availablePerks.find(
          availablePerk => availablePerk.type === rewardPerk.type,
        );
        if (availablePerk) {
          return Number(availablePerk.total) >= Number(rewardPerk.quantity);
        } else {
          return false;
        }
      });
    } else {
      return false;
    }
  }

  async validateOrder() {
    if (
      (this.fulfillment.type === orderFulfillmentTypes.DELIVERY ||
        this.fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY) &&
      !this.fulfillment.id
    ) {
      this.errors.push(orderCreateError.ADDRESS_REQUIRED);
      throw this.errors;
    }
    if (
      this.fulfillment.type === orderFulfillmentTypes.CAR &&
      !this.fulfillment.id
    ) {
      this.errors.push(orderCreateError.VEHICLE_REQUIRED);
      throw this.errors;
    }

    if (!this.brandLocation.acceptingOrders) {
      this.errors.push(orderCreateError.BRAND_LOCATION_NOT_ACCEPTING_ORDERS);
      throw this.errors;
    }

    if (this.rewardPerks.length > 0 && !this.cacheResult) {
      const customerCanUseRewardPerks = await this.customerCanUseRewardPerks();
      // console.log('customerCanUsePerks', customerCanUsePerks);
      if (!customerCanUseRewardPerks) {
        this.errors.push(orderCreateError.INVALID_PERK);
        throw this.errors;
      }
    }

    await this.isCouponAvailable();
    if (this.giftCardIds.length > 0 && !this.cacheResult) {
      // TODO: already fetched this data - remove it
      const giftCard = await this.context.giftCard.getById(this.giftCardIds[0]);
      if (giftCard) {
        if (giftCard.currencyId !== this.currency.id) {
          this.errors.push(orderCreateError.INVALID_GIFT_CARD_CURRENCY);
          throw this.errors;
        }
        // Validate that the customer has enough credit on selected giftCard
        const giftCardBalance = await this.context.giftCardTransaction.getGiftCardBalance(
          this.giftCardIds[0]
        );

        if (Number(giftCardBalance) <= 0) {
          this.errors.push(orderCreateError.INSUFFICIENT_GIFT_CARD_CREDITS);
          throw this.errors;
        }
      } else {
        this.errors.push(orderCreateError.INVALID_GIFT_CARD);
        throw this.errors;
      }
    }
    console.time('checkItems');
    await this.checkItems();
    console.timeEnd('checkItems');

    // check primary options
    console.time('checkOptionsX');
    await this.checkOptions();
    console.timeEnd('checkOptionsX');

    if (this.isSubscriptionUsable) {
      const totalItemsCountInBasket = this.items.reduce((a, o) => a + o.quantity, 0);
      const freeDrinkPerks = this.rewardPerks.filter(perk => perk.type === rewardTierPerkType.FREE_DRINK);
      let totalFreeDrinkCount = 0;
      if (freeDrinkPerks) {
        totalFreeDrinkCount = freeDrinkPerks.reduce((a, o) => a + o.quantity, 0);
      }
      const maxSubscribableItemCount = totalItemsCountInBasket - totalFreeDrinkCount;
      if (maxSubscribableItemCount != 0) {
        const { subscribableMenuItems, subscribableMenuItemsCount } = await this.context.cSubscriptionCustomerTransaction.findSubscribableMenuItemsWithOptionsByMultipleSubscription(this.subscriptionIds, this.items, this.customerId, this.currency, maxSubscribableItemCount);
        this.subscribableItems = subscribableMenuItems;
        this.subscriptionUsedCupsCount = subscribableMenuItemsCount;
      }
    }

    console.time('calculatePrice');
    this.calculatedPrice = await this.calculatePrice();
    const { amountDue, subtotal } = this.calculatedPrice;
    console.timeEnd('calculatePrice');

    // if amountDue is not high minimum order amount order is not valid
    const {
      minimumDeliveryOrderAmount,
      minimumExpressDeliveryOrderAmount,
    } = this.brand;
    if (
      this.fulfillment.type === orderFulfillmentTypes.DELIVERY &&
      parseFloat(subtotal) < parseFloat(minimumDeliveryOrderAmount)
    ) {
      this.errors.push(orderCreateError.INSUFFICIENT_DELIVERY_ORDER_VALUE);
      throw this.errors;
    }

    if (
      this.fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY &&
      parseFloat(subtotal) < parseFloat(minimumExpressDeliveryOrderAmount)
    ) {
      this.errors.push(
        orderCreateError.INSUFFICIENT_EXPRESS_DELIVERY_ORDER_VALUE
      );
      throw this.errors;
    }

    if (
      this.useCredits
      && Number(amountDue) > 0
      && !this.paymentMethodValid(this.input.paymentMethod)
      && !this.input.invoice
    ) {
      this.errors.push(orderCreateError.INSUFFICIENT_CREDITS);
      throw this.errors;
    }

    if (
      Number(amountDue) > 0 &&
      !this.paymentMethodValid(this.input.paymentMethod) &&
      !this.input.invoice
    ) {
      this.errors.push(orderCreateError.PAYMENT_METHOD_REQUIRED);
      throw this.errors;
    }

    if (
      this.input.paymentMethod &&
      this.input.paymentMethod.paymentScheme === paymentSchemes.CASH
    ) {
      if (!this.brandLocation.acceptsCash) {
        this.errors.push(orderCreateError.BRAND_DOESNT_ACCEPT_CASH);
        throw this.errors;
      }
    }

    const externalSourceList = [orderSetSource.SIRI, orderSetSource.ALEXA];
    if (externalSourceList.includes(this.src)) {
      const brandLocationFull = await this.context.brandLocation.getById(this.brandLocationId);
      if (this.src === orderSetSource.SIRI) {
        // SIRI_NOT_SUPPORTED_THIS_PAYMENT_SCHEME
        if (this.input.paymentMethod && !this.allowedPaymentSchemesForSiri.includes(this.input.paymentMethod.paymentScheme)) {
          this.errors.push(orderCreateError.SIRI_NOT_SUPPORTED_THIS_PAYMENT_SCHEME);
          throw this.errors;
        }
      }

      // MENU_ITEM_OUT_OF_STOCK
      const itemAvailabilityList = await Promise.all(this.items.map(t => this.context.menuItem.getAvailability(t.itemId, this.brandLocationId)));
      const isExistSoldOut = itemAvailabilityList.includes(false);
      if (isExistSoldOut) {
        this.errors.push(orderCreateError.MENU_ITEM_OUT_OF_STOCK);
        throw this.errors;
      }

      // MENU_ITEM_OPTION_OUT_OF_STOCK
      const selectedOptionList = this.items.map(t => t.selectedOptions.map(k => k.optionId));
      for (const selectedOptions of selectedOptionList) {
        const existOptionList = await this.context.menuItemOption.getById(selectedOptions);
        if (selectedOptions && existOptionList) {
          const existOptionIdList = existOptionList.map(t => t.id);
          if (selectedOptions.sort().toString() !== existOptionIdList.sort().toString()) {
            this.errors.push(orderCreateError.MENU_ITEM_OPTION_NOT_AVAILABLE);
            throw this.errors;
          }
        } else {
          this.errors.push(orderCreateError.MENU_ITEM_OPTION_NOT_AVAILABLE);
          throw this.errors;
        }
      }

      // INVALID_FULFILLMENT_TYPE
      if (this.fulfillment.type) {
        const availableFulfillmentTypes = this.context.brandLocation.getAllAvailableFulfillmentTypes(brandLocationFull);
        if (!availableFulfillmentTypes.includes(this.fulfillment.type)) {
          this.errors.push(orderCreateError.INVALID_FULFILLMENT_TYPE);
          throw this.errors;
        }

        // OUTSIDE_AVAILABLE_HOURS
        /*
        const branches = [{ branchId: this.brandLocationId }];
        const branchFilters = { fulfillmentType: this.fulfillment.type };
        const branchList = await this.context.brandLocation.getBranches(branches, branchFilters, this.country);
        if (!(branchList && branchList.length > 0)) {
          this.errors.push(orderCreateError.INVALID_BRAND_LOCATION);
          throw this.errors;
        }
        const branch = branchList.find(t => t.id === this.brandLocationId);
        if (!branch) {
          this.errors.push(orderCreateError.INVALID_BRAND_LOCATION);
          throw this.errors;
        }
        const availableStatus = [brandLocationStoreStatusFull.STORE_OPEN, brandLocationStoreStatusFull.STORE_CLOSING_SOON];
        if (!availableStatus.includes(branch.storeStatus)) {
          this.errors.push(orderCreateError.OUTSIDE_AVAILABLE_HOURS);
          throw this.errors;
        }
        */

        const fulfillmentsStatus = await this.context.brandLocation.getNewStoreFulfillmentStatusById(this.brandLocationId);
        if (isEmpty(fulfillmentsStatus)) {
          this.errors.push(orderCreateError.INVALID_BRAND_LOCATION);
          throw this.errors;
        }
        const fulfillmentCamelCase = camelCase(this.fulfillment.type);
        const availableStatus = [brandLocationStoreStatusFull.STORE_OPEN, brandLocationStoreStatusFull.STORE_CLOSING_SOON];
        if (!(fulfillmentCamelCase in fulfillmentsStatus)) {
          this.errors.push(orderCreateError.INVALID_FULFILLMENT_TYPE);
          throw this.errors;
        } else if (!availableStatus.includes(fulfillmentsStatus[fulfillmentCamelCase].storeStatus)) {
          this.errors.push(orderCreateError.OUTSIDE_AVAILABLE_HOURS);
          throw this.errors;
        }

      } else {
        this.errors.push(orderCreateError.INVALID_FULFILLMENT_TYPE);
        throw this.errors;
      }

      // WRONG_CUSTOMER_ADDRESS
      if ((this.fulfillment.type === orderFulfillmentTypes.DELIVERY || this.fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY)
        && this.fulfillment.id) {
        const customerAddress = await this.context.customerAddress.getById(this.fulfillment.id);
        if (!customerAddress || (customerAddress && customerAddress.customerId !== this.customerId)) {
          this.errors.push(orderCreateError.WRONG_CUSTOMER_ADDRESS);
          throw this.errors;
        }

        // ADDRESS_OUT_OF_DELIVERY_ZONE
        if (customerAddress) {
          const { latitude, longitude } = customerAddress;
          if (latitude != null && longitude != null) {
            // TODO: this is not good solution, need to change
            const branchList = await this.context.brandLocation
              .getBranchesOfBrand(
                latitude,
                longitude,
                brandLocationFull.brandId,
              );
            if (!branchList.some(t => t.branchId === this.brandLocationId)) {
              this.errors.push(orderCreateError.ADDRESS_OUT_OF_DELIVERY_ZONE);
              throw this.errors;
            } else {
              const existBranch = branchList.find(t => t.branchId.toString() === this.brandLocationId.toString());
              const branchDistanceInMeters = parseFloat(existBranch.distance);
              if (this.fulfillment.type === orderFulfillmentTypes.DELIVERY) {
                const deliveryRadiusInMeters = (parseFloat(brandLocationFull.deliveryRadius) * 1000);
                if (branchDistanceInMeters > deliveryRadiusInMeters) {
                  this.errors.push(orderCreateError.ADDRESS_OUT_OF_DELIVERY_ZONE);
                  throw this.errors;
                }
              } else if (this.fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY) {
                const expressDeliveryRadiusInMeters = (parseFloat(brandLocationFull.expressDeliveryRadius) * 1000);
                if (branchDistanceInMeters > expressDeliveryRadiusInMeters) {
                  this.errors.push(orderCreateError.ADDRESS_OUT_OF_DELIVERY_ZONE);
                  throw this.errors;
                }
              }
            }
          } else {
            this.errors.push(orderCreateError.WRONG_CUSTOMER_ADDRESS);
            throw this.errors;
          }
        }
      }

      // WRONG_CUSTOMER_VEHICLE
      if (this.fulfillment.type === orderFulfillmentTypes.CAR && this.fulfillment.id) {
        const customerCar = await this.context.customerCar.getById(
          this.fulfillment.id
        );
        if (!customerCar
          || (customerCar && !customerCar.plateNumber)
          || (customerCar && customerCar.plateNumber && customerCar.plateNumber.length <= 0)) {
          this.errors.push(orderCreateError.WRONG_CUSTOMER_VEHICLE);
          throw this.errors;
        }
      }
    }

    if ((this.fulfillment.type === orderFulfillmentTypes.PICKUP || this.fulfillment.type === orderFulfillmentTypes.CAR) && this.selectedArrivalTime != null) {
      const { errors, arrivingTime } = await this.context.arrivingTime.getBranchArrivingTimeList(this.brandLocationId, this.country.id, this.fulfillment.type);
      if (errors.length > 0) {
        if (errors.includes(branchArrivingTimeListError.NOT_SUPPORTED) || errors.includes(branchArrivingTimeListError.NO_VALUES)) {
          this.errors.push(orderCreateError.I_AM_HERE_NOT_SUPPORTED);
          throw this.errors;
        }
      }
      if (!arrivingTime.options.includes(this.selectedArrivalTime)) {
        this.errors.push(orderCreateError.INVALID_ARRIVAL_TIME);
        throw this.errors;
      }
    }
    return this.errors;
  }
  async getInvoice() {
    if (this.cacheResult) {
      return this.cacheResult.invoiceResult;
    }
    const { srcPlatform, srcPlatformVersion } = this.input;

    const components = [
      {
        type: invoiceComponentType.TOTAL,
        value: this.getMoney(this.calculatedPrice.total).round().value,
      },
      {
        type: invoiceComponentType.SUBTOTAL,
        value: this.getMoney(this.calculatedPrice.subtotal).round().value,
      },
      {
        type: invoiceComponentType.AMOUNT_DUE,
        value: this.getMoney(this.calculatedPrice.amountDue).round().value,
      },
    ];
    if (
      parseFloat(this.calculatedPrice.fee) > 0 ||
      parseFloat(this.calculatedPrice.originalFee) !==
      parseFloat(this.calculatedPrice.fee)
    ) {
      components.push({
        type: invoiceComponentType.SERVICE_FEE,
        value: this.getMoney(this.calculatedPrice.fee).round().value,
      });
    }
    if (this.isServiceFeeActive) {
      components.push({
        type: invoiceComponentType.SERVICE_FEE,
        value: this.getMoney(this.calculatedPrice.serviceFeeAmount).round().value,
      });

    }
    if (parseFloat(this.calculatedPrice.couponAmount) > 0 || this.couponId) {
      let couponType = this.coupon.isCashbackCoupon
        ? invoiceComponentType.CASHBACK
        : invoiceComponentType.VOUCHER;

      // TODO: we will remove this check when 22 march,2021 campaign is over or close  to 100% customers  have adapted 6.2.0.0.0 or 5.7.14
      if (couponType === invoiceComponentType.CASHBACK) {
        if (
          isProd &&
          ((isAndroid(srcPlatform) &&
            isBuildBefore(srcPlatformVersion, '6.2.0.0.0')) ||
            (isIOS(srcPlatform) &&
              isBuildBefore(
                srcPlatformVersion ? srcPlatformVersion.substring(0, 6) : null,
                '5.7.14'
              )))
        ) {
          couponType = invoiceComponentType.VOUCHER;
        }
      }

      components.push({
        type: couponType,
        value: this.getMoney(this.calculatedPrice.couponAmount).round().value,
      });
    }
    let rewardDetails = [];
    if (parseFloat(this.calculatedPrice.rewardAmount) > 0) {
      components.push({
        type: invoiceComponentType.REWARD_DISCOUNT,
        value: this.getMoney(this.calculatedPrice.rewardAmount).round().value,
      });
      rewardDetails = filter(this.items, item => item.freeByReward > 0);
    }
    if (parseFloat(this.calculatedPrice.subscriptionAmount) > 0) {
      components.push({
        type: invoiceComponentType.SUBSCRIPTION_DISCOUNT,
        value: this.getMoney(this.calculatedPrice.subscriptionAmount).round().value,
      });
    }
    if (this.useCredits && Number(this.calculatedPrice.creditsUsed) > 0) {
      components.push({
        type: invoiceComponentType.CREDITS,
        value: this.getMoney(this.calculatedPrice.creditsUsed).round().value,
      });
    }
    if (Number(this.calculatedPrice.discoveryCreditUsed) > 0) {
      components.push({
        type: invoiceComponentType.DISCOVERY_CREDITS,
        value: this.getMoney(this.calculatedPrice.discoveryCreditUsed).round()
          .value,
      });
    }
    if (
      this.giftCardIds.length > 0 &&
      Number(this.calculatedPrice.giftCardCreditsUsed) > 0
    ) {
      components.push({
        type: invoiceComponentType.GIFT_CARD,
        value: this.getMoney(this.calculatedPrice.giftCardCreditsUsed).round()
          .value,
      });
    }

    let beans = 0;
    const reward = await this.getReward();
    if (reward) {
      beans = this.context.rewardPointsTransaction
        .calculateOrderPoints({
          orderSetTotal: this.calculatedPrice.total,
          orderSetFee: this.calculatedPrice.fee,
          rewardConversionRate: reward.conversionRate,
        });
    }

    const invoiceResult = {
      isDiscoveryCreditsUsable: this.calculatedPrice.isDiscoveryCreditsUsable,
      isCouponUsable: true,
      isSubscriptionAvailable: this.isSubscriptionUsable,
      subscriptionDetails: this.subscriptionDetails,
      rewardDetails,
      components,
      beans,
      currency: addLocalizationField(
        addLocalizationField(this.currency, 'symbol'),
        'subunitName'
      ),
      // vat: orderSet.vat,
      // totalVat: orderSet.totalVat,
    };
    await this.setInvoiceCache({
      invoiceResult,
      isOrderCreated: false,
    });
    return invoiceResult;
  }

  async createOrder() {
    const vehicleInformation = await (async () => {
      if (this.fulfillment.type === orderFulfillmentTypes.CAR) {
        const customerCar = await this.context.customerCar.getById(
          this.fulfillment.id
        );
        return {
          deliverToVehicle: true,
          vehicleColor: customerCar.color,
          // why brand for description?
          vehicleDescription: customerCar.brand,
          vehiclePlateNumber: customerCar.plateNumber,
          vehicleId: this.fulfillment.id
        };
      }
      return {
        deliverToVehicle: false,
      };
    })();

    await this.checkIsBranchSame(this.brandLocation, this.customerId);

    const orderSet = pick(this.input, [
      'customerId',
      'brandLocationId',
      'note',
      'couponId',
      'src',
      'srcPlatform',
      'srcPlatformVersion',
    ]);

    const orderFulfillment = {
      type: this.fulfillment.type,
      time: moment(now.get()).tz(this.brandLocation.timeZoneIdentifier),
      ...vehicleInformation,
      note: '',
      fulfillmentId: this.fulfillment.id, // external services should know this information for reorder
    };

    let customerCardTokenSnapshot = null;

    const {
      paymentProvider,
      customerCardToken,
    } = await this.context.paymentService.detectPaymentProviderViaPaymentMethod(
      this.paymentMethod
    );

    if (customerCardToken) {
      customerCardTokenSnapshot = cloneObject(customerCardToken);
      delete customerCardTokenSnapshot.providerRaw;
    }

    const getUniqueShortCode = async () => {
      const shortCode = generateShortCode();
      // what is probability of pick same code?
      const [orderSet] = await this.context.orderSet
        .selectFields(['id'])
        .where('short_code', shortCode.toUpperCase());
      if (!orderSet) {
        return shortCode;
      }
      return getUniqueShortCode();
    };
    const shortCode = await getUniqueShortCode();
    const orderSetFieldsFromPriceCalculation = pick(this.calculatedPrice, [
      'fee',
      'subtotal',
      'total',
      'amountDue',
      'currencyId',
      'vat',
      'isCashbackCoupon',
      'couponAmount',
      'rewardAmount',
      'serviceFeeAmount'
    ]);
    Object.assign(orderSet, orderSetFieldsFromPriceCalculation);
    const orderSetId = await this.context.orderSet.save({
      ...orderSet,
      shortCode,
      creditsUsed: this.calculatedPrice.creditsUsed > 0,
      // Allow cash on delivery to be true only if there's amount due and payment method is cash.
      cashOnDelivery:
        this.paymentMethod &&
        this.paymentMethod.paymentScheme === paymentSchemes.CASH &&
        Number(orderSet.amountDue) > 0,
      paymentMethod:
        this.paymentMethod && Number(orderSet.amountDue) > 0
          ? this.paymentMethod.paymentScheme || null
          : null,
      paymentProvider,
      receiptUrl: orderConfig.receiptUrl,
      errorUrl: orderConfig.errorUrl,
    });
    orderSet.id = orderSetId;

    /** Generate integer order id separately for order sets */
    await this.context.orderSet.generateIntIdForOrderSet(orderSet.id, shortCode);

    // set abandoned cart to completed
    await this.context.abandonedCart.setCartCompleted({ basketId: this.basketId, orderSetId: orderSet.id, branchId: this.brandLocationId, cartItems: this.items });
    // save used coupon detail
    if (orderSet.couponId) {
      const couponDetail = this.getCostReductionPerk(this.couponDetails);
      const usedCouponDetails = [];
      if (couponDetail) {
        usedCouponDetails.push({
          usedOn: couponDetailUsedOn.ORDER_SET,
          referenceId: orderSet.id,
          couponId: orderSet.couponId,
          type: couponDetail.type,
          amount: couponDetail.amount,
        });
      }
      const usedPerksCouponDetails =
        this.consumedPerks.filter(cp => cp.coupon) || [];
      usedPerksCouponDetails.forEach(usedPerksCouponDetail => {
        usedCouponDetails.push({
          usedOn: couponDetailUsedOn.ORDER_SET,
          referenceId: orderSet.id,
          couponId: orderSet.couponId,
          type: usedPerksCouponDetail.type,
          amount: usedPerksCouponDetail.quantity,
        });
        return usedPerksCouponDetail;
      });

      if (usedCouponDetails.length > 0) {
        await this.context.usedCouponDetail.save(usedCouponDetails);
        // TOTAL_ORDER_PLACED **********/
        publishEvent(Topic.ANALYTICS_EVENTS,
          {
            eventType: customerAnalyticsEvents.OD_VOUCHER_USED_COUNT,
            orderType: paymentStatusOrderType.ORDER_SET,
            referenceOrderId: orderSetId,
            customerId: this.customerId,
          },
          this.context
        ).catch(err => console.error(err));
      }
    }

    await this.saveMenuItems(this.input, orderSetId, this.consumedPerks);

    const orderFulfillmentId = await this.context.orderFulfillment.save({
      ...orderFulfillment,
      orderSetId,
    });

    if (
      this.fulfillment.type === orderFulfillmentTypes.DELIVERY ||
      this.fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY
    ) {
      await this.saveDeliveryAddress(this.input, orderFulfillmentId);
    }

    if (
      (this.fulfillment.type === orderFulfillmentTypes.PICKUP ||
        this.fulfillment.type === orderFulfillmentTypes.CAR) && this.selectedArrivalTime != null
    ) {
      await this.saveOrderSetArrivingTime(orderSetId,
        this.brandLocationId,
        this.country.id,
        this.fulfillment.type,
        this.selectedArrivalTime);
    }

    const reward = await this.getReward();
    reward && await this.context.customer.sendRewardDetailsToAnalytics(
      this.customerId,
      reward.id,
      this.brandLocation.brandId,
      this.country.id
    );
    const orderSetTotal = get(orderSet, 'total', 0);

    let paymentUrl = null;
    let paymentRawResponse = '{}';
    let usedPerksStatus = 0;
    let orderSetStatusName = orderSetStatusNames.INITIATED;
    let paymentStatus = paymentStatusName.PAYMENT_PENDING;
    const customer = await this.getCustomer();

    // Order payment method object (we will save only if we use payment method)
    const orderPaymentMethodInput = {
      orderType: paymentStatusOrderType.ORDER_SET,
      referenceOrderId: orderSetId,
      paymentProvider,
      paymentMethod: this.paymentMethod || {},
      customerCardTokenSnapshot,
    };
    if (Number(orderSet.amountDue) > 0) {
      // we will save only if we use payment method
      await this.context.orderPaymentMethod.save(orderPaymentMethodInput);
    }

    let debitCreditsAndGiftCardNow = false;
    // allow only if if still needs to be paid
    if (
      paymentProvider === paymentProviders.INTERNAL &&
      Number(orderSet.amountDue) > 0
    ) {
      // cash
      debitCreditsAndGiftCardNow = true;

      orderSetStatusName = orderSetStatusNames.PLACED;
      if (this.paymentMethod.paymentScheme === paymentSchemes.CASH) {
        paymentStatus = paymentStatusName.PAYMENT_PENDING;
        usedPerksStatus = 1;
        paymentRawResponse = '{"isCash": true, "paid": false}';
      }

      await this.context.customerStats.increment(orderSet.customerId, {
        totalKdSpent: Number(orderSetTotal),
        // there will only ever be one order per order set and after a
        // later refactor there will only be one entity and no more of
        // this bullshit.
        totalOrders: 1,
      });
    } else if (Number(orderSet.amountDue) > 0) {
      // await context.orderSet.save({
      //   id: orderSet.id,
      //   amountDue: Number(orderSet.total),
      // });
      // allow if still needs to be paid after credits and giftcard
      // Check 3ds Status by source of order
      const sourceListToDisable3ds = [orderSetSource.SIRI, orderSetSource.ALEXA];
      const isEnabled3ds = sourceListToDisable3ds && this.src ? !sourceListToDisable3ds.includes(this.src) : true;
      const psResponse = await this.context.paymentService.pay({
        language: customer.preferredLanguage,
        currencyCode: this.currency.isoCode,
        countryCode: this.country.isoCode,
        countryId: this.country.id,
        amount: Number(orderSet.amountDue),
        creditsUsed: Number(this.calculatedPrice.creditsUsed),
        giftCardCreditsUsed: Number(this.calculatedPrice.giftCardCreditsUsed),
        discoveryCreditUsed: Number(this.calculatedPrice.discoveryCreditUsed),
        paymentMethod: this.paymentMethod,
        referenceOrderId: orderSet.id,
        orderType: paymentStatusOrderType.ORDER_SET,
        customerId: this.customerId,
        customerPhoneNumber: customer.phoneNumber,
        isEnabled3ds
      });
      if (psResponse.error) {
        paymentStatus = paymentStatusName.PAYMENT_FAILURE;
        await this.context.paymentStatus.save({
          referenceOrderId: orderSet.id,
          orderType: paymentStatusOrderType.ORDER_SET,
          name: paymentStatus,
          rawResponse: psResponse.error,
        });
        console.log(
          'MERCHANT_INITIALIZATION_ERROR: psResponse.error',
          psResponse.error
        );

        return {
          error: [orderSetError.MERCHANT_INITIALIZATION_ERROR],
        };
      }

      await this.context.orderSet.save({
        id: orderSet.id,
        merchantId: psResponse.id,
      });
      paymentUrl = psResponse.paymentUrl;
      paymentRawResponse = psResponse.rawResponse;
      if (psResponse.approved) {
        paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
        debitCreditsAndGiftCardNow = true;
      }
    } else {
      debitCreditsAndGiftCardNow = true;
      paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
      paymentUrl = null;
      paymentRawResponse = `{"orderSetTotal": ${orderSetTotal}}`;
    }

    // store prepaid credits and giftcards
    await this.context.orderSet.save({
      id: orderSet.id,
      prePaid: this.getPrePaid(
        this.calculatedPrice.creditsUsed,
        this.calculatedPrice.giftCardCreditsUsed,
        this.input.giftCardIds,
        this.calculatedPrice.discoveryCreditUsed,
        this.calculatedPrice.subscriptionAmount,
        this.subscriptionDetails,
      ),
    });

    // debit credits or gift card now if any
    if (debitCreditsAndGiftCardNow) {
      // if subscription used
      if (Number(this.calculatedPrice.subscriptionAmount) > 0) {
        await this.context.cSubscriptionCustomerTransaction
          .debitSubscription(
            this.subscriptionDetails,
            orderSet.customerId,
            orderSet.id,
            orderSet.currencyId,
            this.country.id,
            this.brandLocation.id,
            this.brandLocation.brandId
          );
      }

      // if discovery credit are used
      if (Number(this.calculatedPrice.discoveryCreditUsed) > 0) {
        await this.debitTransaction({
          orderSetId,
          paymentStatusOrderType: loyaltyTransactionType.DISCOVERY_CREDITS,
          customerId: orderSet.customerId,
          amount: this.calculatedPrice.discoveryCreditUsed,
          currencyId: orderSet.currencyId,
        });
      }
      // if credits are used
      if (Number(this.calculatedPrice.creditsUsed) > 0) {
        await this.debitTransaction({
          orderSetId,
          paymentStatusOrderType: paymentStatusOrderType.ORDER_SET,
          customerId: orderSet.customerId,
          amount: this.calculatedPrice.creditsUsed,
          currencyId: orderSet.currencyId,
        });
      }
      // if gift card was used
      if (Number(this.calculatedPrice.giftCardCreditsUsed) > 0) {
        await this.debitGiftCardTransaction({
          giftCardId: this.giftCardIds[0],
          orderSetId,
          orderType: paymentStatusOrderType.ORDER_SET,
          customerId: orderSet.customerId,
          amount: Number(this.calculatedPrice.giftCardCreditsUsed),
          currencyId: orderSet.currencyId,
        });
      }

      // add payment transaction if paid by credits or gift card
      if (Number(orderSet.total) - Number(orderSet.amountDue) > 0) {
        await this.transaction({
          orderSetId,
          orderType: paymentStatusOrderType.ORDER_SET,
          action: transactionAction.ORDER,
          type: transactionType.DEBITED,
          customerId: orderSet.customerId,
          currencyId: this.currency.id,
          amount: Number(orderSet.total) - Number(orderSet.amountDue),
        });
      }
    }

    const consumedRewardPerks = this.consumedPerks.filter(consumedPerk => {
      return !consumedPerk.coupon && consumedPerk.type !== 'COUPON';
    });
    // add used reward perks to customer used perks
    await this.addRewardPerksToCustomerUsedPerks(
      orderSetId,
      consumedRewardPerks,
      usedPerksStatus
    );
    // status update should also be reviewed
    // there are some unnecessary database call which already fetched
    await this.context.orderSetStatus.setStatusForOrderSetId(
      orderSetId,
      orderSetStatusName,
      this.context
    );
    // Insert Initial Payment Status
    await this.context.paymentStatus.save({
      referenceOrderId: orderSetId,
      orderType: paymentStatusOrderType.ORDER_SET,
      name: paymentStatus,
      rawResponse: paymentRawResponse,
      paymentProvider,
      countryIso: this.country.isoCode,
      paymentMethod: this.paymentMethod
        ? this.paymentMethod.paymentScheme
        : null
    });
    // checklist
    // - payment is succussful
    // - coupon is appied.
    // - coupon is cashback
    // - credit back the coupon amount as cashback
    if (
      paymentStatus === paymentStatusName.PAYMENT_SUCCESS &&
      orderSet.isCashbackCoupon &&
      orderSet.couponAmount > 0
    ) {
      await this.creditTransaction({
        orderSetId,
        paymentStatusOrderType: loyaltyTransactionType.CASHBACK,
        customerId: orderSet.customerId,
        amount: orderSet.couponAmount,
        currencyId: orderSet.currencyId,
      });
    }

    await this.setInvoiceCache({
      invoiceResult: this.cacheResult ? this.cacheResult.invoiceResult : null,
      isOrderCreated: true,
      orderSetId,
      paymentUrl,
      paymentStatus,
      paymentMethod: this.paymentMethod,
    });
    return {
      paymentUrl,
      orderSetId,
      paymentStatus,
      paymentMethod: this.paymentMethod,
    };
  }

  async saveMenuItems({ items }, orderSetId, consumedPerks) {
    let freeDrinks = 0;
    let freeFood = 0;
    const perkDiscounts = [];
    let totalQuantity = 0;
    let couponDiscount = 0;
    let couponPerQuantity = 0;
    // find the total number of quantities
    items.forEach(i => {
      totalQuantity += parseFloat(i.quantity);
    });
    consumedPerks.forEach(p => {
      switch (p.type) {
        case rewardTierPerkType.FREE_DRINK:
          freeDrinks += p.quantity;
          break;
        case rewardTierPerkType.FREE_FOOD:
          freeFood += p.quantity;
          break;
        case rewardTierPerkType.DISCOUNT:
          perkDiscounts.push(p.tierDiscountMultiplier);
          break;
        case 'COUPON':
          couponDiscount += parseFloat(p.value);
          break;
        default:
          break;
      }
    });
    totalQuantity = totalQuantity - freeDrinks - freeFood;
    couponPerQuantity = this.getMoney(couponDiscount / totalQuantity).round();
    const sortedItems = sortBy(items, [i => i.price]);
    const updatedItems = sortedItems.map(item => {
      item.freeQuantity = 0;
      item.subscriptionQuantity = item.freeBySubscription;
      if (item.type === 'DRINK' && freeDrinks > 0) {
        if (parseFloat(item.quantity) <= freeDrinks) {
          item.freeQuantity = parseFloat(item.quantity);
          freeDrinks -= parseFloat(item.quantity);
        } else if (parseFloat(item.quantity) > freeDrinks) {
          item.freeQuantity = freeDrinks;
          freeDrinks = 0;
        }
      }
      if (item.type === 'FOOD' && freeFood > 0) {
        if (parseFloat(item.quantity) <= freeFood) {
          item.freeQuantity = parseFloat(item.quantity);
          freeFood -= parseFloat(item.quantity);
        } else if (parseFloat(item.quantity) > freeFood) {
          item.freeQuantity = freeFood;
          freeFood = 0;
        }
      }
      // if all quantities are free then there will be no discount applied on any quantity of the item.
      if (item.freeQuantity === parseFloat(item.quantity)) {
        item.couponPerQuantity = 0;
      } else {
        item.couponPerQuantity = couponPerQuantity.value;
      }
      if (perkDiscounts.length > 0) {
        item.perkDiscountMultiplier = perkDiscounts.reduce((a, b) => a * b);
      } else {
        item.perkDiscountMultiplier = 1;
      }
      return {
        ...pick(item, [
          'quantity',
          'note',
          'name',
          'nameAr',
          'nameTr',
          'photo',
          'freeQuantity',
          'couponPerQuantity',
          'perkDiscountMultiplier',
          'subscriptionQuantity',
        ]),
        price: item.price.value,
        orderSetId,
        menuItemId: item.itemId,
      };
    });
    const orderItemIds = await this.context.orderItem.saveMenuItems(
      updatedItems
    );
    const menuItemOptions = sortedItems.map((item, index) => {
      return item.selectedOptions.map(selectedOption => ({
        orderItemId: orderItemIds[index],
        menuItemOptionId: selectedOption.optionId,
        value: selectedOption.value,
        valueAr: selectedOption.valueAr,
        valueTr: selectedOption.valueTr,
        compareAtPrice: selectedOption.compareAtPrice,
        price: selectedOption.price,
      }));
    });
    return this.context.orderItemOption.save(flatten(menuItemOptions));
  }
  async addRewardPerksToCustomerUsedPerks(
    orderSetId,
    rawPerks,
    usedPerksStatus
  ) {
    const perks = [];
    const perkQuantities = {};
    const perksOps = [];
    rawPerks.map(rPerk => {
      perkQuantities[rPerk.type] = perkQuantities[rPerk.type]
        ? perkQuantities[rPerk.type] + rPerk.quantity
        : rPerk.quantity;
      return rPerk;
    });
    Object.keys(perkQuantities).forEach(type => {
      perks.push({
        customerId: this.customerId,
        orderSetId,
        type,
        rewardId: this.reward.id,
        total: perkQuantities[type],
        status: usedPerksStatus,
      });
      if (
        [rewardTierPerkType.DISCOUNT, rewardTierPerkType.ADD_POINTS].includes(
          type
        ) === false &&
        usedPerksStatus === 1
      ) {
        perksOps.push(
          this.context.customerPerk.increment(
            this.customerId,
            this.reward.id,
            type,
            perkQuantities[type] * -1
          )
        );
      }
      return type;
    });
    if (perksOps.length > 0) {
      await Promise.all(perksOps);
    }
    return this.context.customerUsedPerk.save(perks);
  }

  async saveDeliveryAddress({ fulfillment }, orderFulfillmentId) {
    const customerAddress = await this.context.customerAddress.getById(
      fulfillment.id
    );

    const neighborhood = await this.context.neighborhood
      .selectFields(['id', 'name'])
      .where('id', customerAddress.neighborhoodId);

    const fieldsFromCustomerAddress = pick(customerAddress, [
      'geolocation',
      'note',
      'friendlyName',
      'block',
      'street',
      'avenue',
      'streetNumber',
      'type',
      'floor',
      'unitNumber',
      'city',
      'countryCode',
      'dynamicData',
    ]);

    const deliveryAddress = {
      ...fieldsFromCustomerAddress,
      orderFulfillmentId,
      neighborhoodName: neighborhood ? neighborhood.name : null,
      neighborhoodId: neighborhood ? neighborhood.id : null,
      countryCode: customerAddress.countryCode,
    };

    return this.context.deliveryAddress.save(deliveryAddress);
  }

  getPrePaid(
    creditsUsed,
    giftCardCreditsUsed,
    giftCardIds,
    discoveryCreditUsed,
    subscriptionAmount,
    subscriptionDetails
  ) {
    if (
      Number(creditsUsed) > 0 ||
      Number(giftCardCreditsUsed) > 0 ||
      Number(discoveryCreditUsed) > 0 ||
      Number(subscriptionAmount) > 0
    ) {
      const prePaid = {};
      if (Number(creditsUsed) > 0) {
        prePaid.creditsUsed = Number(creditsUsed);
      }
      if (Number(giftCardCreditsUsed) > 0) {
        prePaid.giftCards = [
          { id: giftCardIds[0], value: giftCardCreditsUsed },
        ];
      }
      if (Number(discoveryCreditUsed) > 0) {
        prePaid.discoveryCreditUsed = Number(discoveryCreditUsed);
      }
      if (Number(subscriptionAmount) > 0) {
        prePaid.subscription = subscriptionDetails;
      }
      return prePaid;
    }
    return null;
  }
  debitTransaction({
    orderSetId,
    paymentStatusOrderType,
    customerId,
    amount,
    currencyId,
  }) {
    return this.context.loyaltyTransaction.debit(
      orderSetId,
      paymentStatusOrderType,
      customerId,
      Number(amount),
      currencyId
    );
  }
  debitGiftCardTransaction({
    giftCardId,
    orderSetId,
    orderType,
    customerId,
    amount,
    currencyId,
  }) {
    return this.context.giftCardTransaction.debit({
      giftCardId,
      referenceOrderId: orderSetId,
      orderType,
      customerId,
      amount: Number(amount),
      currencyId,
    });
  }
  transaction({
    orderSetId,
    orderType,
    customerId,
    action,
    type,
    amount,
    currencyId,
  }) {
    return this.context.transaction.save({
      referenceOrderId: orderSetId,
      orderType,
      action,
      type,
      customerId,
      currencyId,
      amount: Number(amount),
    });
  }
  creditTransaction({
    orderSetId,
    paymentStatusOrderType,
    customerId,
    amount,
    currencyId,
  }) {
    return this.context.loyaltyTransaction.credit(
      orderSetId,
      paymentStatusOrderType,
      customerId,
      Number(amount),
      currencyId
    );
  }
  setInvoiceCache({
    isOrderCreated,
    orderSetId,
    invoiceResult,
    paymentUrl,
    paymentStatus,
    paymentMethod,
  }) {
    const data = {
      input: this.input,
      calculatedPrice: this.calculatedPrice,
      invoiceResult,
      isOrderCreated,
      orderSetId,
      createdAt: new Date(),
      paymentUrl,
      paymentStatus,
      paymentMethod,
    };
    const key = this.getCacheKey();
    return redis.set(
      key,
      JSON.stringify(data),
      'EX',
      invoiceCachingTtlInSeconds
    );
  }
  getInvoiceCache() {
    return redis.getByKeyAndParse(this.getCacheKey());
  }
  getCacheKey() {
    // these parameters can change calculation result
    const informationFromInput = pick(JSON.parse(this.stringInput), [
      'items',
      'brandLocationId',
      'fulfillment',
      'useCredits',
      'giftCardIds',
      'couponId',
      'usePerks',
      'paymentMethod'
    ]);
    return `computeInvoice:${hashObject({
      ...informationFromInput,
      customerId: this.customerId,
      basketId: this.basketId,
    })}`;
  }

  async saveOrderSetArrivingTime(orderSetId,
    brandLocationId,
    countryId,
    fulfillmentType,
    selectedArrivalTime) {
    await this.context.arrivingTime.saveOrderSetArrivingTime({
      orderSetId,
      brandLocationId,
      countryId,
      fulfillmentType,
      selectedArrivalTime
    });
  }
  async checkOptions() {
    for (const item of this.items) {
      const menuItemOptionSet = await this.context.menuItemOptionSet.getFirstByMenuItemAndSortOrder(item.itemId);
      const menuItemOptions = await this.context.menuItemOption.getByMenuOptionSet(menuItemOptionSet.id);
      const isExistPrimaryOption = menuItemOptions.some(t => item.selectedOptions.some(k => k.optionId === t.id));
      if (!isExistPrimaryOption) {
        this.errors.push(orderCreateError.MISSING_PRIMARY_MENU_ITEM_OPTION);
        throw this.errors;
      }
    }
  }

  async checkDiscoveryCreditAvailableBeforeCalculation({ brandId, countryId, customerId }) {
    const isDiscoveryCreditAvailable = await this.context.discoveryCredit.isDiscoveryCreditAvailable({
      brandId,
      countryId,
      customerId,
    });
    this.isDiscoveryCreditAvailable = isDiscoveryCreditAvailable;
  }

  async isCouponUsable(invoiceSummary, coupon) {
    const { components } = invoiceSummary;
    const isCouponUsable = {
      status: true,
      unusableList: []
    };
    if (coupon) {
      const discounts = [
        { d: coupon.withReward, t: invoiceComponentType.REWARD_DISCOUNT },
        { d: coupon.withDiscoveryCredit, t: invoiceComponentType.DISCOVERY_CREDITS },
      ];
      const checkDiscount = (discountRow) => {
        const { d: withDiscount, t: discountType } = discountRow;
        if (withDiscount === false) {
          const isExistInComponents = components.some(c => c.type === discountType);
          if (isExistInComponents) {
            isCouponUsable.unusableList.push(discountType);
          }
          isCouponUsable.status = isCouponUsable.status && !isExistInComponents;
        }
      };
      discounts.map(discountObj => checkDiscount(discountObj));
    }
    return isCouponUsable;
  }

  async checkIsBranchSame(brandLocation, customerId) {
    const lastOrder = await this.context.orderSet.getCustomerLastOrder(
      customerId
    );
    if (!lastOrder || lastOrder.brandLocationId !== brandLocation.id) {
      this.context.generalCCCService.sendItToSqs(
        'analytics',
        {
          analyticsProvider: 'BRAZE',
          data: {
            attributes: [
              {
                'external_id': customerId,
                neighborhood: brandLocation.name,
              },
            ],
          },
        },
      ).catch(err => console.error(err));
    }
  }
}

module.exports = ComputeInvoice;
