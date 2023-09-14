const BaseModel = require('../../base-model');
const moment = require('moment');
const {
  compact,
  first,
  get,
  join,
  map,
  omit,
  split,
  uniq,
  head,
  findIndex,
  includes,
  forEach,
  find, assign,
  // isArray,
  // difference,
} = require('lodash');
const {
  transformToCamelCase,
  getDomainFromEmail,
  addPaging,
  formatErrorResponse,
  isNullOrUndefined,
} = require('../../lib/util');
const { validateCouponRedemptionLimit } = require('../../../config');
const CouponReportFormatter = require('./coupon-report-formatter');
const {
  couponStatus,
  couponType,
  couponPayloadError,
  redeemVoucherError,
  loyaltyTransactionType,
  couponDetailUsedOn,
  countryConfigurationKeys,
  brandStatus,
  brandLocationStatus,
  promoType,
  firstOrdersType, invoiceComponentType, couponValidationError,
  orderCouponTypes,
} = require('../root/enums');
// const { paymentSchemes } = require('../../payment-service/enums');
const {
  createCustomerAnalyticsEvent,
  sendCustomerAnalyticsEventToQueue,
} = require('../../lib/customer-analytics');
const {
  adjustDeviceTypeIdentifiers,
  customerAnalyticsEvents,
} = require('../root/enums');
const {
  kinesisEventTypes: { redeemCouponError, redeemCouponSuccess },
} = require('../../lib/aws-kinesis-logging');
const { createLoaders } = require('./loaders');

class Coupon extends BaseModel {
  constructor(db, context) {
    super(db, 'coupons', context);
    this.loaders = createLoaders(this);
  }

  getFiltered(query, countryId, filters) {
    filters = filters || {};
    if (filters.searchTerm) {
      query.andWhere(query => {
        query.orWhere('code', 'ILIKE', `%${filters.searchTerm}%`);
      });
    }

    query.andWhere('country_id', countryId);

    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
    }
    if (filters.status !== 'ALL') {
      query.andWhere('status', filters.status);
    }

    query.orderBy('code');
    return query;
  }

  // eslint-disable-next-line max-params
  getAll(paging, isValid, searchTerm, countryId, filters) {
    let query = this.db(this.tableName);
    if (searchTerm) {
      filters = { ...filters, ...{ searchTerm } };
    }

    query = this.getFiltered(query, countryId, filters);

    query.andWhere('country_id', countryId);

    if (typeof isValid === 'boolean') {
      query.andWhere('is_valid', isValid);
    }

    query.orderBy('code');

    return addPaging(query, paging);
  }

  getByBrand(brandId, paging, countryId) {
    const query = this.db('coupons')
      .select('coupons.*')
      .join('brands_coupons', 'brands_coupons.coupon_id', 'coupons.id')
      .join('brands', 'brands_coupons.brand_id', 'brands.id')
      .where('brands.id', brandId)
      .andWhere('coupons.country_id', countryId)
      .orderBy('code');
    return addPaging(query, paging);
  }

  getCountByBrandAndCountry(brandId, countryId) {
    return this.loaders.countByBrandAndCountry.load([brandId, countryId]);
  }

  getBrandsByCoupon(couponId) {
    return this.db('brands')
      .select('brands.*')
      .join('brands_coupons', 'brands_coupons.brand_id', 'brands.id')
      .where('brands_coupons.coupon_id', couponId);
  }

  getBrandLocationsByCoupon(couponId) {
    return this.db('brand_locations')
      .select('brand_locations.*')
      .join(
        'brand_locations_coupons',
        'brand_locations_coupons.brand_location_id',
        'brand_locations.id'
      )
      .where('brand_locations_coupons.coupon_id', couponId);
  }

  async getCountryByCoupon(couponId) {
    return head(
      await this.db('countries')
        .select('countries.*')
        .join('coupons', 'coupons.country_id', 'countries.id')
        .where('coupons.id', couponId)
    );
  }

  getByCodeAndCustomerId(couponCode, customerId) {
    const query =
      this.getCouponsQuery() + ' where LOWER(cc.code) = :couponCode';

    return this.db
      .raw(query, { customerId, couponCode: couponCode.toLowerCase() })
      .then(result => transformToCamelCase(result.rows))
      .then(first);
  }

  async getByBrandLocationAndCustomerId(
    couponCode,
    brandLocationId,
    customerId
  ) {
    const { id: brandId } = await this.context.brand.getByBrandLocation(
      brandLocationId
    );
    const query =
      this.getCouponsQuery() +
      `
      inner join brands_coupons on brands_coupons.coupon_id = cc.id
      inner join brand_locations_coupons on brand_locations_coupons.coupon_id = cc.id
      where LOWER(cc.code) = :couponCode
      and
      (
        brands_coupons.brand_id = :brandId
        or
        brand_locations_coupons.brand_location_id = :brandLocationId
      )
      `;

    const coupon = await this.db
      .raw(query, {
        customerId,
        couponCode: couponCode.toLowerCase(),
        brandId,
        brandLocationId,
      })
      .then(result => transformToCamelCase(result.rows))
      .then(first);
    return coupon;
  }

  async getByCodeCountryIsoAndCustomerId(couponCode, countryIso, customerId, orderType = orderCouponTypes.REGULAR_ORDER) {
    const country = await this.context.country.getByCode(countryIso);
    if (!country) {
      return null;
    }
    const query =
      this.getCouponsQuery() +
      ' where LOWER(cc.code) = :couponCode AND country_id = :countryId and cc.order_type = :orderType';

    return this.db
      .raw(query, {
        customerId,
        couponCode: couponCode.toLowerCase(),
        countryId: country.id,
        orderType
      })
      .then(result => transformToCamelCase(result.rows))
      .then(first);
  }

  async getByCodeCountryIdAndCustomerId(couponCode, countryId, customerId) {
    const query =
      this.getCouponsQuery() +
      ' where LOWER(cc.code) = :couponCode AND country_id = :countryId';

    return this.db
      .raw(query, {
        customerId,
        couponCode: couponCode.toLowerCase(),
        countryId,
      })
      .then(result => transformToCamelCase(result.rows))
      .then(first);
  }

  getCouponsAvailableByCustomer(customerId, email, countryId, paging) {
    const query = this.db.raw(
      this.getCouponsAvailableQuery() +
        ' and coalesce(TRIM(cc.description), \'\') != \'\' and coalesce(TRIM(cc.hero_photo), \'\') != \'\' and cc.country_id = :countryId  OFFSET :offset LIMIT :limit',
      {
        customerId,
        emailDomain: getDomainFromEmail(email),
        countryId,
        limit: paging.limit ? paging.limit : 101,
        offset: paging.offset ? paging.offset : 0,
      }
    );

    return query.then(result => transformToCamelCase(result.rows));
  }

  async allCredits(customerId, currencyId) {
    const creditsInWallet = {
      promotioanalCredits: 0,
      cashbackAmount: 0,
      referralAmount: 0,
    };
    const {
      cashbackAmount = 0,
      referralAmount = 0,
    } = await this.context.walletAccount.getByCustomerIdAndCurrencyId(
      customerId,
      currencyId
    );
    if (cashbackAmount || referralAmount) {
      creditsInWallet.cashbackAmount = cashbackAmount
        ? Number(cashbackAmount)
        : 0;
      creditsInWallet.referralAmount = referralAmount
        ? Number(referralAmount)
        : 0;
      creditsInWallet.promotioanalCredits =
        creditsInWallet.cashbackAmount + creditsInWallet.referralAmount;
    }

    return creditsInWallet;
  }

  async fetchDiscount({
    customerId,
    couponId,
    subtotal,
    perksAmount = 0,
    useCredits,
    currencyId,
  }) {
    if (!customerId || !couponId) {
      return { amount: 0, percentage: 0 };
    }

    const isValid = await this.isCouponAvailableForCustomer(
      couponId,
      customerId
    );
    if (!isValid) {
      return { amount: 0, percentage: 0 };
    }

    const { maxLimit, type } = await this.getById(couponId);
    if (useCredits && type === promoType.CASHBACK) {
      const { promotioanalCredits } = await this.allCredits(
        customerId,
        currencyId
      );
      subtotal = Math.max(Number(subtotal) - Number(promotioanalCredits), 0);
    }

    // get cost reduction coupon detail
    const couponDetail = await this.context.couponDetail.getCostReductionCouponDetail(
      couponId
    );
    let percentage = 0;
    if (!couponDetail) {
      if (perksAmount > 0) {
        // incorporate perks amount in percentage of discount
        const limit = parseFloat(maxLimit);
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

    if (couponDetail.type === couponType.PERCENTAGE) {
      percentage = parseFloat(couponDetail.amount);
      const limit = parseFloat(maxLimit);
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
    const totalDiscount = Number(couponDetail.amount) + perksAmount;
    if (totalDiscount > subtotal && (!type || type === promoType.REGULAR)) {
      return { amount: Number(subtotal), percentage };
    }
    return { amount: totalDiscount, percentage };
  }

  async isValidCustomerCoupon(customerId, couponId) {
    return this.db('customers_coupons')
      .where('customer_id', customerId)
      .andWhere('coupon_id', couponId)
      .then(first);
  }
  async getAvailableCouponForAuthCustomer(couponId, email, orderType = orderCouponTypes.REGULAR_ORDER) {
    const query = this.getCouponsAvailableQuery() + ' and cc.id = :couponId and cc.order_type = :orderType';
    return this.roDb
      .raw(query, {
        customerId: this.context.auth.id,
        couponId,
        emailDomain: getDomainFromEmail(email),
        orderType
      })
      .then(result => transformToCamelCase(result.rows))
      .then(first);
  }
  async isCouponAvailableForCustomer(couponId, customerId) {
    // const { email } = await this.context.customer.getById(customerId);
    const { email, referralCode } = await this.context.customer.getById(
      customerId
    );
    const query = this.getCouponsAvailableQuery() + ' and cc.id = :couponId';
    const coupon = await this.db
      .raw(query, {
        customerId,
        couponId,
        emailDomain: getDomainFromEmail(email),
      })
      .then(result => transformToCamelCase(result.rows))
      .then(first);

    if (coupon && coupon.customerGroupId) {
      const customerIds = map(
        await this.context.customerGroup.getCustomerIdsFromGroup(
          coupon.customerGroupId
        ),
        c => c.customerId
      );
      if (customerIds.length > 0 && !includes(customerIds, customerId)) {
        return false;
      }
    }

    // check if coupon is referral promo and referral is disabled for that country
    if (coupon && coupon.referralCoupon) {
      const country = await this.context.country.getById(coupon.countryId);
      if (country && !country.isReferralActive) {
        return false;
      }
    }

    if (
      coupon &&
      coupon.onlyFirstOrders &&
      coupon.customerRedemptionLimit > 0
    ) {
      // const customer = await this.context.customer.getById(customerId);
      // if (customer.referralCode === coupon.couponCode) {
      if (referralCode === coupon.couponCode) {
        return false;
      }
      const customerStats = await this.context.customerStats.getByCustomer(
        customerId
      );
      return customerStats.totalOrders < coupon.customerRedemptionLimit;
    }

    return coupon !== undefined;
  }

  async isCouponAvailableForBrand(brandLocationId, couponId) {
    const brandCoupon = await this.db('brands_coupons')
      .select('brands_coupons.*')
      .join(
        'brand_locations',
        'brand_locations.brand_id',
        'brands_coupons.brand_id'
      )
      .where('brand_locations.id', brandLocationId)
      .andWhere('brands_coupons.coupon_id', couponId)
      .then(first);

    return brandCoupon !== undefined;
  }
  async isCouponAvailableForBrandByBrandId(brandId, couponId) {
    const brandCoupon = await this.roDb('brands_coupons')
      .select('brand_id')
      .where('brand_id', brandId)
      .where('coupon_id', couponId)
      .then(first);
    return brandCoupon !== undefined;
  }

  async referralCouponExist(args) {
    if (!args.couponCode) {
      return;
    }
    args.couponCode = args.couponCode.toUpperCase();
    const receiver = await this.context.customer.getById(args.customerId);
    const receiverCountry = await this.context.country.getById(
      receiver.countryId
    );
    if (receiverCountry && receiverCountry.isReferralActive) {
      const [coupon] = await this.roDb('coupons')
        .where('code', args.couponCode)
        .andWhere('country_id', receiver.countryId);

      const [sender] = await this.context.customer.getByReferralCode(
        args.couponCode
      );
      if (!coupon && sender) {
        // to check whether referral already exist or not, add only if its not there
        await this.addCouponCodeWithReferralCode({
          ...args,
          countryId: receiver.countryId,
        });
      }

      if (sender) {
        const referralReceiver = await this.context.referral.getReferralByReceiverId(
          receiver.id
        );

        if (!referralReceiver) {
          await this.context.referral.referCustomerByCode(
            receiver,
            args.couponCode
          );
        }
      }
    }
  }

  async isValidForThisCustomer(couponCode, customerId, countryId, orderType = orderCouponTypes.REGULAR_ORDER) {
    const { email, countryId: cId } = await this.context.customer.getById(
      customerId
    );
    if (!countryId) {
      countryId = cId;
    }
    const country = await this.context.country.getById(countryId);
    const query =
      this.getCouponsAvailableQuery() +
      ` and cc.code ILIKE :couponCode ${
        countryId ? 'and cc.country_id = :countryId' : ''
      } ${orderType ? 'and order_type = :orderType' : ''}`;
    const coupon = await this.db
      .raw(query, {
        customerId,
        couponCode,
        countryId,
        emailDomain: getDomainFromEmail(email),
        orderType
      })
      .then(result => transformToCamelCase(result.rows))
      .then(first);

    // check if coupon is referral promo and referral is disabled for that country
    if (
      coupon &&
      country &&
      coupon.referralCoupon &&
      !country.isReferralActive
    ) {
      return false;
    }

    if (
      coupon &&
      coupon.onlyFirstOrders &&
      coupon.customerRedemptionLimit > 0
    ) {
      const customer = await this.context.customer.getById(customerId);
      if (customer.referralCode === couponCode) {
        return false;
      }
      if (orderType === orderCouponTypes.SUBSCRIPTION_ORDER) {
        const customerStats = await this.context.cSubscriptionOrder.customerSubscriptionOrderStatsByCoupon({ customerId });
        return customerStats.totalOrders < coupon.customerRedemptionLimit;
      } else {
        const customerStats = await this.context.customerStats.getByCustomer(customerId);
        return customerStats.totalOrders < coupon.customerRedemptionLimit;
      }
    }

    if (coupon && coupon.customerGroupId) {
      const isValidCustomerGroup = await this.isValidCustomerGroup(
        coupon.id,
        customerId
      );
      if (!isValidCustomerGroup) {
        return isValidCustomerGroup;
      }
    }

    return coupon !== undefined;
  }

  getCouponsQuery() {
    return `select  cc.id,
                    cc.code,
                    cc.type,
                    cc.flat_amount,
                    cc.percentage,
                    cc.start_date,
                    cc.end_date,
                    cc.is_valid,
                    cc.created_at,
                    cc.max_limit,
                    cc.min_applicable_limit,
                    cc.description,
                    cc.hero_photo,
                    coalesce(cc.redemption_count,0) as redemption_count,
                    cc.redemption_limit,
                    cc.referral_coupon,
                    cc.customer_redemption_limit,
                    cc.redemptions as customer_redemptions_count,
                    cc.country_id,
                    cc.currency_id,
                    cc.only_first_orders,
                    cc.only_first_orders_for,
                    cc.first_orders_redemption_limit,
                    cc.allowed_payment_methods,
                    cc.allowed_banks,
                    cc.allowed_bank_cards,
                    cc.with_reward,
                    cc.with_discovery_credit,
                    cc.customer_group_id as customer_group_id,
                    coalesce(cc.valid_email_domains,'') as valid_email_domains,
                    cc.order_type,
                    cc.status
                  from
                  (
                    select c.*,
                      coalesce(sq1.redemptions,0) as redemptions
                    from coupons c
                    left join (select coupon_id, redemptions from customers_coupons where customer_id = :customerId) sq1
                    on c.id = sq1.coupon_id
                  ) as cc
                  `;
  }

  getCouponsAvailableQuery() {
    /*
    - the coupon's is_valid is true
    - the current time is between the coupon's start date and end date
    - the coupon is within the redemption limit, for both the coupon and any existing customers_coupons relation
    - customers_coupons status is not PROCESSING
    */
    return (
      this.getCouponsQuery() +
      `
                  where cc.is_valid = true
                  and current_timestamp between cc.start_date and cc.end_date
                  ${
      validateCouponRedemptionLimit
        ? ' and (cc.redemption_limit = 0 or coalesce(cc.redemption_count,0) < cc.redemption_limit) and (cc.customer_redemption_limit = 0 OR cc.redemptions < cc.customer_redemption_limit) '
        : ''
      }
        and (
          coalesce(cc.valid_email_domains,'') = ''
            or (
            coalesce(cc.valid_email_domains,'') != ''
            and
            position(lower(:emailDomain) in lower(coalesce(cc.valid_email_domains,''))) >0
            )
          )
        `
    );
  }

  async addNewCouponForCustomer(customerId, couponId) {
    await this.db('customers_coupons').insert({ customerId, couponId });
  }

  async validateCouponSave(coupon) {
    const errors = [];
    let errorDescription = '';
    const {
      couponDetails,
      type,
      cashbackExpireInDays,
      // onlyFirstOrders,
      onlyFirstOrdersFor,
      firstOrdersRedemptionLimit,
    } = coupon;

    if (type && type === promoType.CASHBACK && !cashbackExpireInDays) {
      errors.push(couponPayloadError.CASHBACK_EXPIRY_DAYS_MISSING);
    }

    if (onlyFirstOrdersFor && onlyFirstOrdersFor === firstOrdersType.BRAND) {
      if (!Number.isInteger(Number(firstOrdersRedemptionLimit))) {
        errors.push(couponPayloadError.INVALID_NO_OF_FIRST_ORDERS);
      }
    }

    // Whether bank/bank card info check should be mandatory for voucher creation was not specified
    // This part is left as commented out for now
    /*
    if (coupon.allowedPaymentMethods.includes(paymentSchemes.SAVED_CARD)) {
      const hasValidBanks =
        coupon.allowedBanks && coupon.allowedBanks.length !== 0;
      const hasValidBankCards =
        coupon.allowedBankCards && coupon.allowedBankCards.length !== 0;
      if (!(hasValidBanks || hasValidBankCards)) {
        errors.push(couponPayloadError.SAVED_CARD_BANK_OR_CARD_MISSING);
      }
    }
    */

    /**
     * @deprecated moved to coupon details
     */
    // percent paid validation
    if (
      // eslint-disable-next-line no-constant-condition
      false
      // coupon.percentPaidByCofe &&
      // coupon.percentPaidByVendor &&
      // coupon.percentPaidByCofe + coupon.percentPaidByVendor !== 100
    ) {
      errors.push(couponPayloadError.INVALID_PAID_PERCENTAGE_SUM);
      errorDescription = 'The sum of percent paid by COFE and percent paid by Vendor should be 100.';
    }

    const uniqueTypes = [];
    forEach(couponDetails, cd => {
      if (!cd.deleted) {
        if (uniqueTypes.indexOf(cd.type) === -1) {
          if (cd.type === couponType.FLAT_AMOUNT) {
            const perc = find(
              couponDetails,
              _cd => _cd.type === couponType.PERCENTAGE
            );
            if (perc) {
              errors.push(couponPayloadError.DUPLICATE_TYPE);
              errorDescription = `${couponType.PERCENTAGE} and ${couponType.FLAT_AMOUNT} can not be added at the same time.`;
            } else {
              uniqueTypes.push(cd.type);
            }
          } else if (cd.type === couponType.PERCENTAGE) {
            const fa = find(
              couponDetails,
              _cd => _cd.type === couponType.FLAT_AMOUNT
            );
            if (fa) {
              errors.push(couponPayloadError.DUPLICATE_TYPE);
              errorDescription = `${couponType.PERCENTAGE} and ${couponType.FLAT_AMOUNT} can not be added at the same time.`;
            } else {
              uniqueTypes.push(cd.type);
            }
          } else {
            uniqueTypes.push(cd.type);
          }
          if (
            cd.percentPaidByCofe &&
            cd.percentPaidByVendor &&
            cd.percentPaidByCofe + cd.percentPaidByVendor !== 100
          ) {
            errors.push(couponPayloadError.INVALID_PAID_PERCENTAGE_SUM);
            errorDescription = 'The sum of percent paid by COFE and percent paid by Vendor should be 100.';
          }
        } else {
          errors.push(couponPayloadError.DUPLICATE_TYPE);
          errorDescription = `${cd.type} is already added for the coupon`;
        }
      }
    });
    return { errors, errorDescription };
  }

  async save(coupon) {
    const {
      brands,
      couponDetails,
      brandLocations,
      // customerIds,
      customerGroupId,
      orderDiscountStatus,
    } = coupon;

    coupon.type = coupon.type ? coupon.type : promoType.REGULAR;
    coupon.firstOrdersRedemptionLimit = coupon.firstOrdersRedemptionLimit
      ? Number(coupon.firstOrdersRedemptionLimit)
      : 0;
    // if (coupon.onlyFirstOrdersFor) {
    //   coupon.onlyFirstOrders = true;
    // }

    const couponToSave = omit(coupon, [
      'brands',
      'couponDetails',
      'brandLocations',
      'customerIds',
      'orderDiscountStatus'
    ]);
    // const isUpdate = Boolean(couponToSave.id);
    const validEmailDomains = join(
      uniq(
        compact(
          split(get(coupon, 'validEmailDomains', '').replace(/\s/g, ''), ',')
        )
      ),
      ','
    );
    couponToSave.validEmailDomains = validEmailDomains.toLowerCase();
    if (couponToSave.countryId) {
      const [country] = await this.db('countries').where(
        'id',
        couponToSave.countryId
      );
      couponToSave.currencyId = country.currencyId;
    }

    // couponToSave.isValid = false;
    if (couponToSave.status === couponStatus.ACTIVE) {
      couponToSave.isValid = true;
    } else if (couponToSave.status) {
      couponToSave.isValid = false;
    }

    // Coupon audit information
    if (this.context.auth && this.context.auth.id) {
      if (coupon) {
        if (coupon.id) {
          couponToSave.updatedBy = this.context.auth.id;
          couponToSave.updatedAt = moment(Date.now());
        } else {
          couponToSave.createdBy = this.context.auth.id;
        }
      }
    }

    if (orderDiscountStatus) {
      const {
        withReward,
        withDiscoveryCredit,
      } = orderDiscountStatus;
      couponToSave.withReward = withReward || true;
      couponToSave.withDiscoveryCredit = withDiscoveryCredit || true;
    }

    const couponId = await super.save(couponToSave);
    const brandCoupons = map(brands, brandId => ({
      brandId,
      couponId,
    }));

    // if (isUpdate) {
    //   let { customerGroupId } = await this.getById(couponToSave.id);
    //   if (customerIds && isArray(customerIds)) {
    //     if (customerGroupId) {
    //       const currentCustomersInGroup = map(
    //         await this.context.customerGroup.getCustomersFromGroup(
    //           customerGroupId
    //         ),
    //         c => c.id
    //       );
    //       const removeCustomersFromGroup = difference(
    //         currentCustomersInGroup,
    //         customerIds
    //       );
    //       const addCustomersToGroup = difference(
    //         customerIds,
    //         currentCustomersInGroup
    //       );
    //       if (removeCustomersFromGroup.length > 0) {
    //         await this.context.customerGroup.removeCustomersFromGroup(
    //           customerGroupId,
    //           removeCustomersFromGroup
    //         );
    //       }
    //       if (addCustomersToGroup.length > 0) {
    //         await this.context.customerGroup.addCustomersToGroup(
    //           customerGroupId,
    //           addCustomersToGroup
    //         );
    //       }
    //     } else {
    //       customerGroupId = await this.context.customerGroup.createGroupForVoucher(
    //         customerIds
    //       );
    //       await super.save({
    //         id: couponId,
    //         customerGroupId,
    //       });
    //     }
    //   } else if (customerGroupId) {
    //     await this.db(this.tableName)
    //       .update('customer_group_id', null)
    //       .where('id', couponId);
    //     await this.context.customerGroup.deleteById(customerGroupId);
    //   }
    // }

    // if (!isUpdate && customerIds && isArray(customerIds)) {
    //   const customerGroupId = await this.context.customerGroup.createGroupForVoucher(
    //     customerIds
    //   );
    //   await super.save({
    //     id: couponId,
    //     customerGroupId,
    //   });
    // }
    if (customerGroupId) {
      await super.save({
        id: couponId,
        customerGroupId,
      });
    } else {
      // await super.save({
      //   id: couponId,
      //   customerGroupId: null,
      // });

      await this.db(this.tableName)
        .update('customer_group_id', null)
        .where('id', couponId);
    }

    await this.db('brands_coupons')
      .where('coupon_id', couponId)
      .delete();
    if (brandCoupons.length > 0)
      await this.db('brands_coupons').insert(brandCoupons);

    const brandLocationsCoupons = map(brandLocations, brandLocationId => ({
      brandLocationId,
      couponId,
    }));

    await this.db('brand_locations_coupons')
      .where('coupon_id', couponId)
      .delete();
    if (brandLocationsCoupons.length > 0)
      await this.db('brand_locations_coupons').insert(brandLocationsCoupons);

    // couponDetails
    let couponDetailsToSave = [];
    if (couponToSave.id) {
      // if it's an update get coupon details from DB
      couponDetailsToSave = (await this.context.couponDetail.getAllByCoupon(
        couponToSave.id
      )).map(couponDetail => {
        couponDetail.deleted = true;
        return couponDetail;
      });
    }

    couponDetails.map(couponDetail => {
      couponDetail.couponId = couponId;
      if (
        includes(
          [
            couponType.ADD_POINTS,
            couponType.FREE_DELIVERY,
            couponType.FREE_DRINK,
            couponType.FREE_FOOD,
          ],
          couponDetail.type
        )
      ) {
        couponDetail.amount = parseInt(couponDetail.amount, 10);
      }
      if (couponDetail.id) {
        const idx = findIndex(
          couponDetailsToSave,
          c => c.id === couponDetail.id
        );
        if (idx >= 0) {
          couponDetailsToSave.splice(idx, 1, couponDetail);
        } else {
          delete couponDetail.id;
          couponDetailsToSave.push(couponDetail);
        }
      } else {
        couponDetailsToSave.push(couponDetail);
      }

      return couponDetail;
    });
    await this.context.couponDetail.save(couponDetailsToSave);

    return couponId;
  }

  async isValidCustomerGroup(couponId, customerId) {
    const coupon = await this.getById(couponId);
    if (!coupon) {
      return true;
    }
    if (!coupon.customerGroupId) {
      return true;
    }
    const exists = await this.context.customerGroup.getByCustomerGroupIdAndCustomerId(
      coupon.customerGroupId,
      customerId
    );
    if (exists) {
      return true;
    }
    return false;
  }

  async isValidForCustomerGroup(customerGroupId, customerId) {
    const exists = await this.context.customerGroup.getByCustomerGroupIdAndCustomerId(
      customerGroupId,
      customerId
    );
    if (exists) {
      return true;
    }
    return false;
  }

  async getAllToCSV(stream, countryId, searchTerm, filterType) {
    let query = this.roDb(this.tableName);
    query = this.getFiltered(query, countryId, {
      status: filterType,
      searchTerm,
    });

    // console.log('query', query.toString());
    return query
      .stream(s => s.pipe(new CouponReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  async redeem(code, customerId) {
    function sendErrorResponse(errors) {
      return {
        ...formatErrorResponse(errors),
        redeemed: false,
      };
    }
    const isValid = await this.isValidForThisCustomer(code, customerId, null);
    if (!isValid) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          code,
          customerId,
          errorReason: 'Coupon is not valid for user',
        },
        redeemCouponError
      );
      return sendErrorResponse([redeemVoucherError.INVALID_VOUCHER]);
    }
    const coupon = await this.getByCodeAndCustomerId(code, customerId);
    if (!coupon) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          code,
          customerId,
          errorReason: 'Coupon doesnt exists',
        },
        redeemCouponError
      );
      return sendErrorResponse([redeemVoucherError.INVALID_VOUCHER]);
    }
    const credits = find(
      await this.context.couponDetail.getAllByCoupon(coupon.id),
      c => c.type === couponType.COFE_CREDITS
    );
    if (!credits || parseFloat(credits.amount) < 0) {
      await this.context.kinesisLogger.sendLogEvent(
        {
          code,
          customerId,
          errorReason:
            'Coupon doesnt include any credits or has negative credits',
        },
        redeemCouponError
      );
      return sendErrorResponse([redeemVoucherError.INVALID_VOUCHER]);
    }

    const transactionId = await this.context.loyaltyTransaction.credit(
      coupon.id,
      loyaltyTransactionType.VOUCHER,
      customerId,
      credits.amount,
      coupon.currencyId
    );
    if (transactionId) {
      await this.context.usedCouponDetail.save({
        usedOn: couponDetailUsedOn.CREDITS_TRANSACTION,
        referenceId: transactionId,
        couponId: coupon.id,
        type: credits.type,
        amount: credits.amount,
      });
      await this.incrementCouponCountersForCustomer(coupon.id, customerId);

      const customerDefaultDevice = await this.context.deviceMetadata.getDefaultByCustomer(
        customerId
      );
      if (!isNullOrUndefined(customerDefaultDevice)) {
        const analyticsEvent = createCustomerAnalyticsEvent({
          customerId,
          deviceIdentifierType:
            adjustDeviceTypeIdentifiers[
              customerDefaultDevice.deviceIdentifierType
            ],
          deviceId: customerDefaultDevice.deviceId,
          eventType: customerAnalyticsEvents.REWARDS_REDEMPTION,
          eventNote: credits.type,
          eventData: credits.amount,
        });
        await sendCustomerAnalyticsEventToQueue(analyticsEvent);
      }

      const currency = await this.context.currency.getById(coupon.currencyId);

      await this.context.kinesisLogger.sendLogEvent(
        {
          couponId: coupon.id,
          customerId,
          amount: credits.amount,
          creditsType: credits.type,
          currency: currency.isoCode,
          referenceId: transactionId,
        },
        redeemCouponSuccess
      );
    }

    return { redeemed: Boolean(transactionId) };
  }

  async incrementCouponCountersForCustomer(
    couponId,
    customerId,
    increment = 1
  ) {
    const isValidCustomerCoupon = await this.isValidCustomerCoupon(
      customerId,
      couponId
    );

    if (isValidCustomerCoupon) {
      await this.db('customers_coupons')
        .where('customer_id', customerId)
        .andWhere('coupon_id', couponId)
        .increment('redemptions', Number(increment));
    } else {
      await this.addNewCouponForCustomer(customerId, couponId);
    }

    // if referral coupon has been redeemed with 3 times (configurable) in country_configuration,
    // then mark customer as referral reward availed

    await this.db('coupons')
      .where('id', couponId)
      .increment('redemption_count', Number(increment));
  }

  async addCouponCodeWithReferralCode(args) {
    const configurationKeys = [
      countryConfigurationKeys.REFERRAL_RECEIVER_DISCOUNT_PERCENTAGE,
      countryConfigurationKeys.MAX_REFERRAL_DISCOUNT_LIMIT,
      countryConfigurationKeys.REFERRAL_REWARD_ON_FIRST_X_ORDERS,
      countryConfigurationKeys.REFERRAL_RECEIVER_PROMO_LEVEL,
      countryConfigurationKeys.REFERRAL_RECEIVER_PROMO_X_ORDERD_PER_BRAND,
    ];

    const configurations = await this.context.countryConfiguration.getByKeys(
      configurationKeys,
      args.countryId
    );

    const brands = await this.context.brand.getAllByCountryId(args.countryId, {
      status: brandStatus.ACTIVE,
    });
    const brandLocations = await this.roDb('brand_locations')
      .whereIn('brand_id', brands.map(b => b.id))
      .andWhere('status', brandLocationStatus.ACTIVE);

    const configurationMap = new Map(
      configurations.map(i => [i.configurationKey, i.configurationValue])
    );

    const receiverPromoLevelType = configurationMap.get(
      countryConfigurationKeys.REFERRAL_RECEIVER_PROMO_LEVEL
    );

    let onlyFirstOrdersFor = null;

    if (receiverPromoLevelType === firstOrdersType.BRAND) {
      onlyFirstOrdersFor = firstOrdersType.BRAND;
    }

    let percentageAmount = configurationMap.get(
      countryConfigurationKeys.REFERRAL_RECEIVER_DISCOUNT_PERCENTAGE
    );
    percentageAmount = percentageAmount ? percentageAmount : 0;

    if (Number(percentageAmount) > 0) {
      const coupon = {
        code: args.couponCode,
        maxLimit: configurationMap.get(
          countryConfigurationKeys.MAX_REFERRAL_DISCOUNT_LIMIT
        ),
        status: 'ACTIVE',
        percentage: configurationMap.get(
          countryConfigurationKeys.REFERRAL_RECEIVER_DISCOUNT_PERCENTAGE
        ),
        customerRedemptionLimit: configurationMap.get(
          countryConfigurationKeys.REFERRAL_REWARD_ON_FIRST_X_ORDERS
        ),
        onlyFirstOrders: true,
        onlyFirstOrdersFor,
        firstOrdersRedemptionLimit: configurationMap.get(
          countryConfigurationKeys.REFERRAL_RECEIVER_PROMO_X_ORDERD_PER_BRAND
        ),
        countryId: args.countryId,
        brands: brands.map(b => b.id),
        brandLocations: brandLocations.map(b => b.id),
        startDate: moment(),
        endDate: moment().add(10, 'years'),
        couponDetails: [
          {
            type: couponType.PERCENTAGE,
            amount: configurationMap.get(
              countryConfigurationKeys.REFERRAL_RECEIVER_DISCOUNT_PERCENTAGE
            ),
          },
        ],
        redemptionLimit: 0,
        referralCoupon: true,

        withReward: true,
        withDiscoveryCredit: true,
      };
      await this.save(coupon);
      return true;
    }
    return false;
  }

  async getUserSummaryById(id) {
    if (id) {
      try {
        const customer = await this.context.customer.getById(id);

        if (customer) {
          return {
            id: customer.id,
            fullName: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            isAdmin: false,
            isCustomer: true,
          };
        }
      } catch (err) {
        console.log('GetUserSummary (customer/getById) Error', err);
      }

      try {
        const admin = await this.context.admin.getByAuthoId(id);

        if (admin) {
          return {
            id: admin.id,
            fullName: `${admin.name}`,
            email: admin.email,
            isAdmin: true,
            isCustomer: false,
          };
        }
      } catch (err) {
        console.log('GetUserSummary (admin/getByAuthoId) Error', err);
      }

      try {
        const admin = await this.context.admin.getById(id);

        if (admin) {
          return {
            id: admin.id,
            fullName: `${admin.name}`,
            email: admin.email,
            isAdmin: true,
            isCustomer: false,
          };
        }
      } catch (err) {
        console.log('GetUserSummary (admin/getById) Error', err);
      }
    }
    return null;
  }

  async getTotalCouponAmountUsedInOrders(id) {
    const totalCouponAmount = await this.db('order_sets')
      .sum('coupon_amount')
      .where('coupon_id', id)
      .andWhere('paid', true)
      .groupBy('coupon_id')
      .then(first);

    return totalCouponAmount ? totalCouponAmount.sum : 0;
  }

  async checkOrderComponents(order, coupon) {
    const errorList = [];
    try {
      const customerId = this.context.auth.id;
      const inputWithCustomerId = assign(order, {
        customerId: order.customerId ? order.customerId : customerId,
        srcPlatform: this.context.req.xAppOs || null,
        srcPlatformVersion: this.context.req.xAppVersion || null,
      });
      const couponUsable = await this.context.orderSet.couponUsableForOrder(inputWithCustomerId, coupon);
      if (couponUsable) {
        if (couponUsable.status === false) {
          couponUsable.unusableList.map(t => {
            switch (t) {
              case invoiceComponentType.REWARD_DISCOUNT:
                errorList.push(couponValidationError.CAN_NOT_BE_USED_WITH_REWARD_DISCOUNT);
                break;
              case invoiceComponentType.DISCOVERY_CREDITS:
                errorList.push(couponValidationError.CAN_NOT_BE_USED_WITH_DISCOVERY_POINT);
                break;
            }
          });
        }
      } else {
        errorList.push(couponValidationError.UNEXPECTED_ERROR);
      }
    } catch (e) {
      errorList.push(couponValidationError.UNEXPECTED_ERROR);
    }
    return errorList;
  }
}

module.exports = Coupon;
