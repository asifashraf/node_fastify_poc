/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const {
  omit,
  forEach,
  toNumber,
  find,
  sortBy,
  first,
  filter,
  assign,
  get,
} = require('lodash');
const moment = require('moment');
const phoneVerification = require('../../lib/phone-verification');
const {
  customerRegisterError,
  customerRegisterLiteError,
  customerUpdateError,
  customerSetLoyaltyTierError,
  rewardTierPerkApplyType,
  rewardTierPerkType,
  countryConfigurationKeys,
  rewardTierType,
} = require('../root/enums');
const {
  addPaging,
  getloyaltyTierBySku,
  getloyaltyTierByName,
  generateShortCode,
  addLocalizationField,
  validateEmail,
  transformToCamelCase
} = require('../../lib/util');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const { loyaltyTopUpSku, defaultMaxLimit, isProd, basePath } = require('../../../config');
const CustomerReportFormatter = require('./customers-report-formatter');
const { publishVerifiedEmailToBraze } = require('../../lib/braze');

class Customer extends BaseModel {
  constructor(db, context) {
    super(db, 'customers', context);
  }

  getGuestByPhoneNumber(phoneNumber) {
    return this.db(this.tableName)
      .where('phone_number', phoneNumber)
      .whereNull('autho_id');
  }

  async getAll(paging, loyaltyTierName, searchTerm, filters) {
    filters = filters || {};

    const query = this.roDb(this.tableName);

    if (searchTerm) {
      query.andWhere(query => {
        query.orWhere('first_name', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('last_name', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('phone_number', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('email', 'ILIKE', `%${searchTerm}%`);
      });
    }

    if (loyaltyTierName) {
      query.andWhere('loyalty_tier', loyaltyTierName);
    }

    if (filters.rewardId) {
      query.andWhereRaw(
        `(select reward_id from customer_tiers where customer_id  = customers.id order by updated desc limit 1) = '${filters.rewardId}' `
      );
    }

    if (filters.rewardTierId) {
      query.andWhereRaw(
        `(select reward_tier_id from customer_tiers where customer_id  = customers.id order by updated desc limit 1) = '${filters.rewardTierId}' `
      );
    }
    const countQuery = query.clone();
    const limit = get(paging, 'limit', defaultMaxLimit);
    const offset = get(paging, 'offset', 0);
    const count = await countQuery.count('*').first();
    const totalItems = count ? count.count : 0;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
    const currentPage = offset
      ? Math.round(offset / limit) + 1
      : 1;
    const customers = await addPaging(query, paging, defaultMaxLimit);
    return { paging: { totalItems, totalPages, currentPage }, customers };
  }

  getAllExportToCSV(
    stream,
    searchTerm,
    loyaltyTierName,
    rewardId,
    rewardTierId
  ) {
    const query = this.roDb(this.tableName);

    query.select(
      this.db.raw(
        `customers.*,
        countries.name countryName,
        countries.service_phone_number countryPhone,
        (SELECT coalesce((sum(credit) - sum(debit)),0) as balance FROM loyalty_transactions WHERE customer_id = customers.id) creditBalance,
        (SELECT total_kd_spent from customer_stats where customer_id = customers.id) totalKdSpent,
        (SELECT created_at from order_sets where customer_id = customers.id order by created_at desc limit 1) lastOrderSetDate,
        (select string_agg(concat(type,'(',trunc(total)::double precision,')'), ',') from customer_used_perks where customer_id = customers.id) usedPerks,
        (select string_agg(concat(type,'(',trunc(total)::double precision,')'), ',') from customer_perks where customer_id = customers.id) availablePerks
        `
      )
    );

    query.leftJoin('countries', 'countries.id', 'customers.country_id');

    if (searchTerm) {
      query.andWhere(query => {
        query.orWhere('first_name', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('last_name', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('phone_number', 'ILIKE', `%${searchTerm}%`);
        query.orWhere('email', 'ILIKE', `%${searchTerm}%`);
      });
    }

    if (loyaltyTierName) {
      query.andWhere('loyalty_tier', loyaltyTierName);
    }

    if (rewardId) {
      query.andWhereRaw(
        `(select reward_id from customer_tiers where customer_id  = customers.id order by updated desc limit 1) = '${rewardId}' `
      );
    }

    if (rewardTierId) {
      query.andWhereRaw(
        `(select reward_tier_id from customer_tiers where customer_id  = customers.id order by updated desc limit 1) = '${rewardTierId}' `
      );
    }

    // console.log(query.toString());
    return query
      .stream(s => s.pipe(new CustomerReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  getByEmail(email) {
    return this.db(this.tableName)
      .whereRaw(`lower(email) = '${email.toLowerCase()}' `)
      .first();
  }

  getCustomerIdsFromEmailsOrPhonesOrIds(
    emails = [],
    phoneNumbers = [],
    customerIds = []
  ) {
    const query = this.roDb(this.tableName).select('id');
    let str = '';
    if (emails && emails.length > 0) {
      // query.whereRaw(`lower(email) in `);
      str += ` lower(email) in (${"'" + emails.join("','") + "'"}) `;
    }
    if (phoneNumbers && phoneNumbers.length > 0) {
      if (str !== '') {
        str += ' or ';
      }
      str += ` phone_number in (${"'" + phoneNumbers.join("','") + "'"}) `;
    }
    if (customerIds && customerIds.length > 0) {
      if (str !== '') {
        str += ' or ';
      }
      str += ` id in (${"'" + customerIds.join("','") + "'"}) `;
    }
    if (str !== '') {
      query.whereRaw(str);
    }
    return query;
  }

  getByPhoneNumber(phoneNumber) {
    return this.roDb(this.tableName)
      .where('phone_number', `${phoneNumber}`)
      .orWhere('phone_number', `+${phoneNumber}`)
      .first();
  }

  getAllByPhoneNumber(phoneNumber) {
    return this.roDb(this.tableName)
      .where('phone_number', `${phoneNumber}`)
      .orWhere('phone_number', `+${phoneNumber}`);
  }

  async validateAuth0Register(customer) {
    const errors = [];

    const emailCheckId = await this.getByField('email', customer.email);

    if (emailCheckId && emailCheckId !== customer.id) {
      errors.push(customerRegisterError.DUPLICATE_EMAIL);
    }

    const phoneNumber = customer.phoneNumber ? customer.phoneNumber.trim() : '';
    const phoneCountry = customer.phoneCountry
      ? customer.phoneCountry.trim()
      : '';

    if (phoneNumber.length > 0 && phoneCountry.length === 0) {
      errors.push(customerRegisterError.PHONE_COUNTRY_REQUIRED);
    }

    if (phoneNumber.length === 0 && phoneCountry.length > 0) {
      errors.push(customerRegisterError.PHONE_REQUIRED);
    }

    const countryCode = (customer.countryCode || '').trim();
    if (countryCode) {
      const country = await this.context.country.getByCode(countryCode);
      if (!country) {
        errors.push(customerRegisterError.INVALID_COUNTRY_CODE);
      }
    }

    return errors;
  }

  async validateRegister(customer) {
    const errors = [];

    const isValid = await this.isValid(customer);

    if (isValid) {
      errors.push(customerRegisterError.DUPLICATE_ID);
    }

    const emailCheckId = await this.getByField('email', customer.email);

    if (emailCheckId && emailCheckId !== customer.id) {
      errors.push(customerRegisterError.DUPLICATE_EMAIL);
    }

    return errors;
  }

  async validateGuestRegister(customer) {
    const errors = [];

    const isValid = await this.isValid(customer);

    if (isValid) {
      errors.push(customerRegisterError.DUPLICATE_ID);
    }

    const countryCode = (customer.countryCode || '').trim();
    if (countryCode) {
      const country = await this.context.country.getByCode(countryCode);
      if (!country) {
        errors.push(customerRegisterError.INVALID_COUNTRY_CODE);
      }
    }

    return errors;
  }

  async validateUpdate(customer) {
    const errors = [];
    const isValid = await this.isValid(customer);

    if (!isValid) {
      errors.push(customerUpdateError.INVALID_CUSTOMER);
    }

    let phoneNumber = customer.phoneNumber ? customer.phoneNumber.trim() : '';
    let phoneCountry = customer.phoneCountry
      ? customer.phoneCountry.trim()
      : '';
    if (phoneNumber.length === 0 || phoneCountry.length === 0) {
      const cst = await this.context.db('customers as c')
        .where('c.id', customer.id)
        .select('c.phone_number', 'c.phone_country')
        .first();
      phoneNumber = cst.phoneNumber;
      phoneCountry = cst.phoneCountry;
    }
    if ( !phoneCountry || phoneCountry.length === 0) {
      errors.push(customerUpdateError.PHONE_COUNTRY_REQUIRED);
    }

    if (!phoneNumber || phoneNumber.length === 0) {
      errors.push(customerUpdateError.PHONE_REQUIRED);
    }

    if (customer.isTermsAndConditionsAccepted === false) {
      errors.push(customerUpdateError.TERMS_AND_CONDITIONS_MUST_BE_ACCEPTED);
    }

    if (customer.isPrivacyPolicyAccepted === false) {
      errors.push(customerUpdateError.PRIVACY_POLICY_MUST_BE_ACCEPTED);
    }

    if(customer.fullName && (customer.fullName.split(' ')).length < 2) {
      errors.push(customerRegisterError.INVALID_FULL_NAME);
    }

    if(errors.length > 0 ) return errors;

    const customerPhoneNumber = await this.context.db('customers as c')
      .join('auth_customer as ac', 'c.id', 'ac.id')
      .where('ac.is_disabled', false)
      .where('c.phone_number', phoneNumber.trim())
      .whereNot('c.id', customer.id)
      .select('c.id')
      .first();

    if (customerPhoneNumber) {
      errors.push(customerUpdateError.DUPLICATE_PHONE);
    }

    // if (customer.email) {
    //   const existingCustomerWithEmail = await this.context.customer.getByEmail(
    //     customer.email
    //   );
    //   if (
    //     existingCustomerWithEmail &&
    //     existingCustomerWithEmail.id !== customer.id
    //   ) {
    //     errors.push(customerUpdateError.DUPLICATE_EMAIL);
    //   }
    // }
    const countryCode = (customer.countryCode || '').trim();
    if (countryCode) {
      const country = await this.context.country.getByCode(countryCode);
      if (!country) {
        errors.push(customerUpdateError.INVALID_COUNTRY_CODE);
      }
    }
    return errors;
  }

  async validateNotificationUpdate(customer) {
    const errors = [];
    const isValid = await this.isValid(customer);
    if (!isValid) {
      errors.push(customerUpdateError.INVALID_CUSTOMER);
    }
    return errors;
  }

  async update(customer) {
    // Attach Notifications Settings info to customer
    const brazeNotification = { customerId: customer.id };
    forEach(customer.notificationSettings, (value, key) => {
      customer[key] = value;
      switch (key) {
        case 'newOffers':
          // eslint-disable-next-line camelcase
          assign(brazeNotification, { new_offers: value });
          break;
        case 'allowSms':
          // eslint-disable-next-line camelcase
          assign(brazeNotification, { allow_sms: value });
          break;
        case 'allowEmail':
          // eslint-disable-next-line camelcase
          assign(brazeNotification, { allow_email: value });
          break;
        default:
          break;
      }
    });
    publishVerifiedEmailToBraze(brazeNotification, null);

    return await super.save(omit(customer, ['notificationSettings']));
  }

  async register(customer) {
    this._idLoader.clear(customer.id);
    const [customerExists] = await this.db(this.tableName).where(
      'id',
      customer.id
    );
    if (customerExists) {
      return customerExists.id;
    }

    return this.db(this.tableName).insert(customer);
  }

  async validateAndRegister(customer) {
    const errors = [];
    try {
      this._idLoader.clear(customer.id);

      if (!customer || !customer.email || !customer.phoneNumber) {
        errors.push(customerRegisterLiteError.INVALID_CUSTOMER);
        return errors;
      }

      if (!validateEmail(customer.email)) {
        errors.push(customerRegisterLiteError.INVALID_EMAIL);
        return errors;
      }

      let seperatedFullName = customer.fullName.split(' ');
      if(seperatedFullName.length < 2) {
        return errors.push(customerRegisterLiteError.INVALID_FULL_NAME);
      }
      customer.firstName = seperatedFullName[0];
      seperatedFullName.shift();
      customer.lastName = seperatedFullName.join(' ');

      let query = this.db(this.tableName)
        .select('email', 'phone_number as phoneNumber')
        .where('phone_number', customer.phoneNumber)
        .orWhere('phone_number', `+${customer.phoneNumber}`)
        .first();

      query = query.orWhereRaw(`lower(email) = '${customer.email.trim().toLowerCase()}'`);
      const existCustomer = await query;
      if (existCustomer) {
        if (
          existCustomer.email &&
          existCustomer.email.trim().toLowerCase() ===
          customer.email.trim().toLowerCase()
        ) {
          errors.push(customerRegisterLiteError.DUPLICATE_EMAIL);
        } else if (
          existCustomer.phoneNumber &&
          (existCustomer.phoneNumber.trim() === customer.phoneNumber.trim() ||
            existCustomer.phoneNumber.trim() ===
            `+${customer.phoneNumber.trim()}`)
        ) {
          errors.push(customerRegisterLiteError.DUPLICATE_PHONE);
        } else {
          errors.push(customerRegisterLiteError.INVALID_CUSTOMER);
        }

        if (errors && errors.length > 0) {
          return errors;
        }
      } else {
        await this.db(this.tableName).insert(omit(customer, ['fullName']));
        return errors;
      }
    } catch (err) {
      console.log('customerRegisterLite.validateAndRegister', err);
      errors.push(customerRegisterLiteError.INVALID_CUSTOMER);
      return errors;
    }
  }

  // eslint-disable-next-line no-unused-vars
  async registerPushDeviceToken(customerId, token, service) {
    /*
    try {
      await this.context.notification.pushRegisterDevice(
        service,
        customerId,
        token
      );
      return true;
    } catch (err) {
      console.log('Error registering device token', err);
      return false;
    } */
    return true;
  }

  // eslint-disable-next-line no-unused-vars
  unregisterPushDeviceToken(token) {
    /*
    return this.context.notification
      .pushUnregisterDevice(token)
      .then(() => true)
      .catch(() => false);
     */
    return true;
  }

  // eslint-disable-next-line no-unused-vars
  unregisterAllPushDeviceTokens(customerId) {
    /*
    return this.context.notification
      .pushUnregisterCustomer(customerId)
      .then(() => true)
      .catch(() => false);
     */
    return true;
  }

  requestPhoneVerificationToken(customerId, route, countryCode, phone) {
    if (route !== 'SMS') {
      // At this time only SMS verification is supported.
      return Promise.resolve(false);
    }
    return phoneVerification
      .startPhoneVerificationViaSMS(countryCode, phone)
      .catch(() => {
        return Promise.resolve(false);
      });
  }

  verifyPhoneVerificationToken(customerId, token, countryCode, phone) {
    return phoneVerification
      .verifyPhoneVerificationToken(token, countryCode, phone)
      .then(async isPhoneVerified => {
        const updates = {
          id: customerId,
          phone_country: countryCode,
          phone_number: phone,
          isPhoneVerified,
        };
        await this.update(updates);
        return isPhoneVerified;
      })
      .catch(() => false);
  }

  // Note: This method is used by customerSetLoyaltyTier mutation to manually update the Tier name of a user.
  async assignLoyaltyTierByName(customerId, loyaltyTierName) {
    const validationErrors = [];

    const newLoyaltyTier = getloyaltyTierByName(loyaltyTierName);

    if (newLoyaltyTier === null || newLoyaltyTier === undefined) {
      validationErrors.push(customerSetLoyaltyTierError.INVALID_LOYALTY_TIER);
    }

    if (!this.isValid({ id: customerId })) {
      validationErrors.push(customerSetLoyaltyTierError.INVALID_CUSTOMER);
    }

    if (validationErrors.length > 0) {
      return {
        error: validationErrors[0],
        errors: validationErrors,
      };
    }

    return this.assignLoyaltyTier(customerId, newLoyaltyTier, false);
  }

  async assignLoyaltyTierBySku(customerId, loyaltyTierSku) {
    if (loyaltyTierSku !== loyaltyTopUpSku) {
      const newLoyaltyTier = getloyaltyTierBySku(loyaltyTierSku);
      return this.assignLoyaltyTier(customerId, newLoyaltyTier, true);
    }
  }

  async assignLoyaltyTier(customerId, newLoyaltyTier, checkPreviousTiers) {
    let updateTier = true;

    if (checkPreviousTiers) {
      const { loyaltyTier: tierName } = await this.getById(customerId);
      // Customer may not have a tier defined yet
      if (tierName !== null && tierName !== undefined) {
        const currentLoyaltyTier = getloyaltyTierByName(tierName);
        const currentValue =
          toNumber(currentLoyaltyTier.amount) +
          toNumber(currentLoyaltyTier.bonus);
        const newValue =
          toNumber(newLoyaltyTier.amount) + toNumber(newLoyaltyTier.bonus);

        if (currentValue >= newValue) {
          // Current Loyalty Tier is greater than the one we are setting, we should not update the customer Tier
          updateTier = false;
        }
      }
    }
    if (updateTier) {
      return this.update({ id: customerId, loyaltyTier: newLoyaltyTier.name });
    }
  }

  async canUsePerks(customerId, brandId, perks) {
    const reward = first(await this.context.reward.getByBrandId(brandId));
    if (!reward) {
      return false;
    }

    const availablePerks = await this.context.customerPerk.getAvailableForReward(
      customerId,
      reward.id
    );
    if (availablePerks.length === 0) {
      return false;
    }
    let canUse = true;
    perks.map(perk => {
      const avPerk = find(availablePerks, { type: perk.type });
      canUse = canUse && Boolean(avPerk) && avPerk.total >= perk.quantity;
      return perk;
    });
    return canUse;
  }

  async getCurrentRewardProgramsDetails(customerId, brandId) {
    const pointsTransactionQuery = this.context.rewardPointsTransaction
      .getAll()
      .where('reward_points_transactions.customer_id', customerId)
      .select('reward_points_transactions.reward_id')
      .groupBy('reward_points_transactions.reward_id');

    if (brandId) {
      pointsTransactionQuery
        .join('rewards', 'reward_points_transactions.reward_id', 'rewards.id')
        .where('rewards.brand_id', brandId);
    }

    const pointsTransaction = await pointsTransactionQuery;
    const rewardIds = new Set(
      pointsTransaction.map(customerTier => customerTier.rewardId)
    );
    const rewardProgramsDetails = [...rewardIds].map(rewardId =>
      this.getRewardProgramDetailsNew(customerId, rewardId)
    );
    return Promise.all(rewardProgramsDetails);
  }

  async getRewardProgramDetails(customerId, rewardId) {
    const reward = addLocalizationField(
      addLocalizationField(
        await this.context.reward.getById(rewardId),
        'title'
      ),
      'conversionName'
    );
    const customer = await this.getById(customerId);
    if (!customer) {
      return false;
    }
    const tiers = sortBy(
      await this.context.rewardTier.getAllByRewardId(rewardId),
      [t => parseInt(t.requiredPoints, 10)]
    );
    await this.context.customerTier.syncTier(customerId, rewardId);
    const lastTier = await this.context.customerTier.getCurrentTier(
      customerId,
      rewardId
    );
    const currentPoints = await this.context.rewardPointsTransaction.calculatePoints(
      customerId,
      rewardId
    );
    let currentTier = null;
    let nextTier = null;
    let pointsToNextTier = null;
    let availablePerks = null;
    let usedPerks = await this.context.customerUsedPerk
      .getByCustomerId(customerId)
      .where('reward_id', rewardId);
    if (lastTier) {
      currentTier = find(tiers, t => t.id === lastTier.rewardTierId);
      nextTier = find(
        tiers,
        t => parseInt(t.requiredPoints, 10) > currentPoints
      );

      // why localized title??
      const availablePerksRaw = addLocalizationField(
        await this.context.customerPerk.getAvailableForReward(
          customerId,
          rewardId
        ),
        'title'
      );

      const allRewardPerks = addLocalizationField(
        await this.context.rewardTierPerk.getAllByRewardId(rewardId),
        'title'
      );

      availablePerks = [];

      const tierSpecialPerks = addLocalizationField(
        filter(
          await this.context.rewardTierPerk.getAllByRewardTierId(
            currentTier.id
          ),
          o => o.applyType === rewardTierPerkApplyType.SPECIAL
        ),
        'title'
      );
      if (!usedPerks) {
        usedPerks = await this.context.customerUsedPerk
          .getByCustomerId(customerId)
          .where('reward_id', rewardId);
      }
      tierSpecialPerks.map(tierSpecialPerk => {
        if (tierSpecialPerk.type === rewardTierPerkType.ADD_POINTS) {
          const birthdayPointsAdded = usedPerks.find(t => {
            return (
              t.type === rewardTierPerkType.ADD_POINTS &&
              t.status === 1 &&
              moment(t.created).isAfter(moment().subtract(1, 'y'))
            );
          });
          if (
            moment(customer.birthday).format('MM-DD') ===
            moment().format('MM-DD') &&
            !birthdayPointsAdded
          ) {
            availablePerks.push({
              id: tierSpecialPerk.id,
              title: {
                en: tierSpecialPerk.title ? tierSpecialPerk.title.en : '',
                ar: tierSpecialPerk.title ? tierSpecialPerk.title.ar : '',
              },
              type: tierSpecialPerk.type,
              total: tierSpecialPerk.value,
            });
          }
        }
        return tierSpecialPerk;
      });

      const tierOngoingPerks = addLocalizationField(
        filter(
          await this.context.rewardTierPerk.getAllByRewardTierId(
            currentTier.id
          ),
          o => o.applyType === rewardTierPerkApplyType.ONGOING
        ),
        'title'
      );
      tierOngoingPerks.map(ongPerk => {
        availablePerks.push({
          id: ongPerk.id,
          title: {
            en: ongPerk.title ? ongPerk.title.en : '',
            ar: ongPerk.title ? ongPerk.title.ar : '',
          },
          type: ongPerk.type,
          total: ongPerk.value,
        });
        return ongPerk;
      });

      availablePerksRaw.map(avPerk => {
        const foundPerk = find(allRewardPerks, t => t.type === avPerk.type);
        // TODO: we shouldn't use customer titles here this is a quick fix.
        // instead we should start saving titles in customer_perks for history and display!!
        // REF: ADD_DYNAMIC_TITLE_CUSTOMER_PERKS
        const { title = null } = foundPerk
          ? foundPerk
          : this.customTitleName(avPerk.type);

        availablePerks.push({
          id: generateShortCode(),
          title: {
            en: title ? title.en : '',
            ar: title ? title.ar : '',
          },
          type: avPerk.type,
          total: avPerk.total,
        });
        return avPerk;
      });
    } else if (tiers.length > 0) {
      // no yet in a tier
      nextTier = first(tiers);
    }

    if (nextTier) {
      pointsToNextTier = parseInt(nextTier.requiredPoints, 10) - currentPoints;
    }

    return {
      reward,
      currentTier,
      nextTier,
      currentPoints: parseInt(currentPoints, 10),
      pointsToNextTier: pointsToNextTier ? parseInt(pointsToNextTier, 10) : null,
      availablePerks,
      usedPerks,
    };
  }

  async getCustomerRewardProgramDetailsByCountry(countryId, brandId) {
    const customerId = this.context.auth.id;
    const pointsTransactionQuery = this.context.rewardPointsTransaction
      .getAll()
      .select('reward_points_transactions.reward_id')
      .join('rewards', 'reward_points_transactions.reward_id', 'rewards.id')
      .join('brands', 'rewards.brand_id', 'brands.id')
      .sum({ total: 'points' })
      .andWhere('reward_points_transactions.customer_id', customerId)
      .andWhere('brands.country_id', countryId)
      .groupBy('reward_points_transactions.reward_id');

    if (brandId) {
      pointsTransactionQuery.where('rewards.brand_id', brandId);
    }

    const pointsTransaction = await pointsTransactionQuery;
    const mappedPointsTransaction = pointsTransaction.map(item => {
      item.total = parseFloat(item.total);
      return item;
    });
    const rewardIds = [
      ...new Set(
        sortBy(
          mappedPointsTransaction.map(customerTier => customerTier.rewardId)
        )
      ),
    ];
    return this.getProgramDetailsOfRewards(
      customerId,
      rewardIds,
      mappedPointsTransaction
    );
  }

  async getProgramDetailsOfRewards(customerId, rewardIds, pointsTransaction) {
    const allRewards = await this.context.reward.getById(rewardIds);
    const allRewardTiers = (await this.context.rewardTier.getAllByRewardIds(
      rewardIds
    )).map(rewardTier => {
      rewardTier.requiredPoints = parseFloat(rewardTier.requiredPoints);
      return rewardTier;
    });
    const allCustomerLastTiers = await this.context.customerTier.getCurrentTiers(
      customerId,
      rewardIds
    );
    const allCustomerRewardPoints = pointsTransaction
      ? pointsTransaction
      : await this.context.rewardPointsTransaction.calculateRewardsPoints(
        customerId,
        rewardIds
      );

    const resList = [];
    for (const rewardId of rewardIds) {
      const reward = addLocalizationField(
        addLocalizationField(find(allRewards, { id: rewardId }), 'title'),
        'conversionName'
      );
      const tiers = sortBy(filter(allRewardTiers, { rewardId }), [
        t => parseInt(t.requiredPoints, 10),
      ]);
      const lastTier = first(filter(allCustomerLastTiers, { rewardId }));
      const currentPoint = parseFloat(
        find(allCustomerRewardPoints, {
          rewardId,
        }).total
      );
      let currentTier = null;
      let nextTier = null;
      let pointsToNextTier = null;
      let availablePerks = null;
      let usedPerks = null;
      if (lastTier) {
        // eslint-disable-next-line no-await-in-loop
        const customer = await this.context.customer.getById(customerId);
        if (!customer) {
          return false;
        }
        currentTier = find(tiers, t => t.id === lastTier.rewardTierId);
        nextTier = find(
          tiers,
          t => parseInt(t.requiredPoints, 10) > currentPoint
        );

        // why localized title??
        const availablePerksRaw = addLocalizationField(
          // eslint-disable-next-line no-await-in-loop
          await this.context.customerPerk
            .getAvailableForReward(customerId, rewardId)
            .select('type', 'total'),
          'title'
        );

        const allRewardPerks = addLocalizationField(
          // eslint-disable-next-line no-await-in-loop
          await this.context.rewardTierPerk.getAllByRewardId(rewardId),
          'title'
        );

        availablePerks = [];

        const tierSpecialPerks = addLocalizationField(
          filter(
            // eslint-disable-next-line no-await-in-loop
            filter(allRewardPerks, { rewardTierId: currentTier.id }),
            o => o.applyType === rewardTierPerkApplyType.SPECIAL
          ),
          'title'
        );
        // eslint-disable-next-line no-await-in-loop
        usedPerks = await this.context.customerUsedPerk
          .getByCustomerId(customerId)
          .select('type', 'status')
          .where('reward_id', rewardId);
        tierSpecialPerks.map(tierSpecialPerk => {
          if (tierSpecialPerk.type === rewardTierPerkType.ADD_POINTS) {
            const birthdayPointsAdded = usedPerks.find(t => {
              return (
                t.type === rewardTierPerkType.ADD_POINTS &&
                t.status === 1 &&
                moment(t.created).isAfter(moment().subtract(1, 'y'))
              );
            });
            if (
              moment(customer.birthday).format('MM-DD') ===
              moment().format('MM-DD') &&
              !birthdayPointsAdded
            ) {
              availablePerks.push({
                id: tierSpecialPerk.id,
                title: {
                  en: tierSpecialPerk.title ? tierSpecialPerk.title.en : '',
                  ar: tierSpecialPerk.title ? tierSpecialPerk.title.ar : '',
                },
                type: tierSpecialPerk.type,
                total: parseFloat(tierSpecialPerk.value),
              });
            }
          }
          return tierSpecialPerk;
        });

        const tierOngoingPerks = addLocalizationField(
          filter(
            // eslint-disable-next-line no-await-in-loop
            filter(allRewardPerks, { rewardTierId: currentTier.id }),
            o => o.applyType === rewardTierPerkApplyType.ONGOING
          ),
          'title'
        );
        tierOngoingPerks.map(ongPerk => {
          availablePerks.push({
            id: ongPerk.id,
            title: {
              en: ongPerk.title ? ongPerk.title.en : '',
              ar: ongPerk.title ? ongPerk.title.ar : '',
            },
            type: ongPerk.type,
            total: parseFloat(ongPerk.value),
          });
          return ongPerk;
        });

        availablePerksRaw.map(avPerk => {
          const foundPerk = find(allRewardPerks, t => t.type === avPerk.type);
          // TODO: we shouldn't use customer titles here this is a quick fix.
          // instead we should start saving titles in customer_perks for history and display!!
          // REF: ADD_DYNAMIC_TITLE_CUSTOMER_PERKS
          const { title = null } = foundPerk
            ? foundPerk
            : this.customTitleName(avPerk.type);

          availablePerks.push({
            id: generateShortCode(),
            title: {
              en: title ? title.en : '',
              ar: title ? title.ar : '',
            },
            type: avPerk.type,
            total: parseFloat(avPerk.total),
          });
          return avPerk;
        });
      } else {
        // no yet in a tier
        nextTier = first(tiers);
      }

      if (nextTier) {
        pointsToNextTier = parseInt(nextTier.requiredPoints, 10) - currentPoint;
      }
      const res = {
        reward,
        currentTier,
        nextTier,
        currentPoints: parseInt(currentPoint, 10),
        pointsToNextTier: pointsToNextTier ? parseInt(pointsToNextTier, 10) : null,
        availablePerks,
        usedPerks,
      };
      resList.push(res);
    }
    const sortedResList = sortBy(resList, [t => t.currentPoints]).reverse();
    const orderedActiveTiers = [
      rewardTierType.DIAMOND,
      rewardTierType.PLATINUM,
      rewardTierType.GOLD,
      rewardTierType.SILVER,
    ];
    const sortedByTier = [];

    orderedActiveTiers.forEach(rewardTier => {
      const filteredList = sortedResList.filter(
        t =>
          t.currentTier &&
          t.currentTier.type &&
          t.currentTier.type.toString() === rewardTier.toString()
      );
      if (filteredList.length > 0) sortedByTier.push(...filteredList);
    });
    const unrankedList = sortedResList.filter(t => !t.currentTier);
    if (unrankedList.length > 0) sortedByTier.push(...unrankedList);
    return sortedByTier;
  }

  customTitleName(type) {
    switch (type) {
      case rewardTierPerkType.DISCOUNT:
        return { title: { en: 'Discount', ar: 'خصم', tr: '' } };
      case rewardTierPerkType.FREE_FOOD:
        return { title: { en: 'Free Food', ar: 'طعام مجاني', tr: '' } };
      case rewardTierPerkType.FREE_DRINK:
        return { title: { en: 'Free Drink', ar: 'مشروب مجاني', tr: '' } };
      case rewardTierPerkType.FREE_DELIVERY:
        return { title: { en: 'Free Delivery', ar: 'توصيل مجاني', tr: '' } };
      default:
        return {};
    }
  }

  async getWallet(customerId) {
    const walletAccounts = await this.context.walletAccount.getAccounts(
      customerId
    );
    return { accounts: walletAccounts };

    // calculate wallet and save it to DB
    // next time it will be returned directly from DB
    // const wallet = { accounts: [] };
    // const currencyIds = (await this.context.country.getAllActive()).map(
    //   country => country.currencyId
    // );
    // const currencies = await this.db('currencies').whereIn('id', currencyIds);
    // await Promise.all(
    //   currencies.map(async currency => {
    //     const total = await this.context.loyaltyTransaction.getBalanceByCustomer(
    //       customerId,
    //       currency.id
    //     );
    //     wallet.accounts.push({
    //       total,
    //       currencyId: currency.id,
    //       regularAmount: total,
    //       referralAmount: 0,
    //       referralAmountExpiresOn: moment()
    //         .add(5, 'days')
    //         .format('YYYY-MM-DD'),
    //     });
    //     return currency;
    //   })
    // );
    // return wallet;
  }

  async getCountryWallet({ countryId, customerId, paging, location, radius }) {
    const walletAccount = await this.context.walletAccount.getAccount({
      countryId,
      customerId,
    });
    let brands = [];
    if (location) {
      brands = await this.context.brandLocation.brandsForDiscoveryCreditsByCountryId(
        {
          countryId,
          paging,
          location,
          radius,
          customerId,
        }
      );
    }

    return { account: walletAccount, brands };
  }

  getByReferralCode(referralCode) {
    return this.db(this.tableName).where(
      'referral_code',
      referralCode.toUpperCase()
    );
  }

  async markIfReferralRewardAvailed(orderSet) {
    const customer = await this.getById(orderSet.customerId);
    if (!customer.referralRewardAvailed) {
      const dbConfig = await this.context.countryConfiguration.getByKey(
        countryConfigurationKeys.REFERRAL_REWARD_ON_FIRST_X_ORDERS,
        customer.countryId
      );
      const configurationValue = dbConfig ? dbConfig.configurationValue : null;
      const sender = await this.context.referral.getReferralSender(customer.id);
      if (sender && configurationValue) {
        const coupon = await this.context.coupon.getByCodeCountryIdAndCustomerId(
          sender.referralCode,
          customer.countryId,
          customer.id
        );

        if (coupon) {
          const [customersCoupons] = await this.db('customers_coupons')
            .where('customer_id', customer.id)
            .andWhere('coupon_id', coupon.id);

          if (
            customersCoupons &&
            customersCoupons.redemptions >= configurationValue
          ) {
            await this.db(this.tableName)
              .where('id', customer.id)
              .update('referral_reward_availed', true);
          }
        }
      }
    }
  }

  async generateReferralCode() {
    const getUniqueShortCode = async () => {
      const referralCode = generateShortCode(10);
      const [customer] = await this.getByReferralCode(referralCode);
      if (!customer) {
        return referralCode;
      }
      return getUniqueShortCode();
    };

    return getUniqueShortCode();
  }

  async generateAndSaveReferralCodeForCustomer(id) {
    const referralCode = await this.generateReferralCode();
    await this.db(this.tableName)
      .where({ id })
      .update({ referralCode });

    return referralCode;
  }

  async verifyCustomerEmailById(id) {
    const updatedCustomerList = await this.db(this.tableName)
      .update('is_email_verified', true)
      .where('id', id);
    return updatedCustomerList !== 0; // updatedCustomerList return updated rows count
  }

  async getRewardProgramDetailsNew(customerId, rewardId) {
    const reward = addLocalizationField(
      addLocalizationField(
        await this.context.reward.getById(rewardId),
        'title'
      ),
      'conversionName'
    );
    const customer = await this.getById(customerId);
    if (!customer) {
      return false;
    }
    const tiers = sortBy(
      await this.context.rewardTier.getAllByRewardId(rewardId),
      [t => parseInt(t.requiredPoints, 10)]
    );
    await this.context.customerTier.syncTier(customerId, rewardId);
    const lastTier = await this.context.customerTier.getCurrentTier(
      customerId,
      rewardId
    );
    const currentPoints = await this.context.rewardPointsTransaction.calculatePoints(
      customerId,
      rewardId
    );
    let currentTier = null;
    let nextTier = null;
    let pointsToNextTier = null;
    let availablePerks = [];
    let usedPerks = null;
    if (lastTier) {
      currentTier = find(tiers, t => t.id === lastTier.rewardTierId);
      nextTier = find(
        tiers,
        t => parseInt(t.requiredPoints, 10) > currentPoints
      );

      const rewardTierPerks = await this.context.rewardTierPerk.getAllByRewardTierId(
        currentTier.id
      );

      const tierSpecialPerks = addLocalizationField(
        filter(
          rewardTierPerks,
          o => o.applyType === rewardTierPerkApplyType.SPECIAL
        ),
        'title'
      );

      usedPerks = await this.context.customerUsedPerk
        .getByCustomerId(customerId)
        .where('reward_id', rewardId);

      tierSpecialPerks.map(tierSpecialPerk => {
        if (tierSpecialPerk.type === rewardTierPerkType.ADD_POINTS) {
          const birthdayPointsAdded = usedPerks.find(t => {
            return (
              t.type === rewardTierPerkType.ADD_POINTS &&
              t.status === 1 &&
              moment(t.created).isAfter(moment().subtract(1, 'y'))
            );
          });
          if (
            moment(customer.birthday).format('MM-DD') ===
            moment().format('MM-DD') &&
            !birthdayPointsAdded
          ) {
            availablePerks.push({
              id: tierSpecialPerk.id,
              title: {
                en: tierSpecialPerk.title ? tierSpecialPerk.title.en : '',
                ar: tierSpecialPerk.title ? tierSpecialPerk.title.ar : '',
              },
              type: tierSpecialPerk.type,
              total: tierSpecialPerk.value,
            });
          }
        }
        return tierSpecialPerk;
      });

      const query = await this.roDb('view_rewards')
        .select('*')
        .where('customer_id', customerId)
        .andWhere('reward_id', rewardId);
      const queryResult = query.filter(
        x =>
          moment(x.created).valueOf() ===
          Math.max(...query.map(x => moment(x.created).valueOf()))
      );

      const customerPerks = await this.roDb('customer_perks')
        .select('*')
        .where('customer_id', customerId)
        .andWhere('reward_id', rewardId);

      availablePerks = await Promise.all(
        queryResult.map(async elem => {
          const { title } = this.customTitleName(elem.perksType);
          const perk = {};
          if (!elem.perksType || !elem.perkId) {
            let url = basePath + (isProd ? '/rewards-program/' : '/vendor/rewards-program/') + elem.rewardId + '/tier-perks';
            url = url.replace('api', 'admin');
            SlackWebHookManager.sendTextToSlack(`
              [ERROR] No perks defined under the tier(${elem.tierTitle}). Please check it.
              URL -> ${url}
              customerId -> ${elem.customerId}
              rewardId -> ${elem.rewardId}
              brandId -> ${elem.brandId}
            `);
            return null;
          }
          perk.type = elem.perksType;
          perk.title = title;
          if (elem.perksType === rewardTierPerkType.DISCOUNT) {
            perk.total = elem.perksValue;
            perk.id = elem.perkId;
          } else {
            perk.id = generateShortCode();
            const { total } = customerPerks.find(x => x.type === elem.perksType) || {};
            perk.total = total ? total : elem.perksValue;
          }
          return perk;
        })
      );
    } else if (tiers.length > 0) {
      // no yet in a tier
      nextTier = first(tiers);
    }
    if (nextTier) {
      pointsToNextTier = parseInt(nextTier.requiredPoints, 10) - currentPoints;
    }

    return {
      reward,
      currentTier,
      nextTier,
      currentPoints: parseInt(currentPoints, 10),
      pointsToNextTier: pointsToNextTier ? parseInt(pointsToNextTier, 10) : null,
      availablePerks,
      usedPerks,
    };
  }

  async getPopUpStatus(customerId) {
    const { arrivingPopupStatus } = await this.db(this.tableName)
      .select('arriving_popup_status')
      .where('id', customerId)
      .first();
    return arrivingPopupStatus;
  }

  async savePopUpStatus(customerId) {
    return !!this.save({ id: customerId, arrivingPopupStatus: true });
  }

  async getFavoriteBrandLast30Days(customerId) {
    const query = await this.roDb.raw(`
      select
        f2.customer_id,
        f2.brand_name,
        f2.cnt
      from
        (
          select
            x.customer_id,
            max(x.cnt) as mx
          from
            (
              select
                customer_id,
                brand_id,
                count(*) as cnt
              from
                view_orders vo
              where
                created_at >= (now() - interval '1' month)
                and customer_id = '${customerId}'
                and current_status = 'COMPLETED'
              group by
                customer_id,
                brand_id) as x
          group by
            x.customer_id) as f1
      left join (
        select
          customer_id,
          brand_name,
          count(*) as cnt
        from
          view_orders vo
        where
          created_at >= (now() - interval '1' month)
          and customer_id = '${customerId}'
          and current_status = 'COMPLETED'
        group by
          customer_id,
          brand_name) as f2
      on
        f1.mx = f2.cnt
        and f2.customer_id = f1.customer_id
`).then(result => transformToCamelCase(result.rows));
    if (query && query.length > 0) {
      this.sendItToSqs(
        'analytics',
        {
          analyticsProvider: 'BRAZE',
          data: {
            attributes: [
              {
                'external_id': customerId,
                'favorite_brand': query[0].brandName,
              }
            ]
          },
        }
      ).catch(err => console.error(err));
    }
  }

  async sendRewardDetailsToAnalytics(customerId, rewardId, brandId, countryId) {
    const details = await this.getRewardProgramDetailsNew(
      customerId,
      rewardId,
      brandId
    );
    const { nextTier, pointsToNextTier, availablePerks } = details;
    const brand = await this.context.brand.getById(brandId);
    const country = await this.context.country.getById(countryId);
    this.sendItToSqs(
      'analytics',
      {
        analyticsProvider: 'BRAZE',
        data: {
          attributes: [
            {
              'external_id': customerId,
              [`${brand.name}_${country.isoCode}_rewards`]: {
                nextTier,
                pointsToNextTier,
                availablePerks
              }
            }
          ]
        },
      }
    ).catch(err => console.error(err));
  }

  async sendPurchaseEvent(orderSet, orderItems, brand) {
    const currency = await this.context.currency.getById(orderSet.currencyId);
    const freeItemsTotal = orderItems.reduce((freeItemsTotal, item) => {
      const totalFreeQuantity = Number(item.freeQuantity)
        + Number(item.subscriptionQuantity);
      freeItemsTotal += totalFreeQuantity * Number(item.price);
      return freeItemsTotal;
    }, 0);
    const cashbackAmount = await this.context.loyaltyTransaction
      .cashbackAmountForOrder(orderSet.id);
    const totalDiscount = Number(orderSet.subtotal)
      + Number(orderSet.fee)
      - Number(orderSet.total)
      - freeItemsTotal
      + cashbackAmount;
    const segregatedOrderItems = orderItems.reduce(
      (segregatedOrderItems, item) => {
        const totalFreeQuantity = Number(item.freeQuantity)
          + Number(item.subscriptionQuantity);
        const paidQuantity = Number(item.quantity) - totalFreeQuantity;

        if (paidQuantity > 0) {
          const discountShareMultiplier = (
            Number(item.quantity) * Number(item.price)
          ) / Number(orderSet.subtotal);
          const discountShare = discountShareMultiplier * totalDiscount;
          segregatedOrderItems.push({
            ...item,
            quantity: paidQuantity,
            price: Number(item.price) - discountShare / paidQuantity
          });
        }
        if (totalFreeQuantity > 0) {
          segregatedOrderItems.push({
            ...item,
            quantity: totalFreeQuantity,
            price: 0,
          });
        }
        return segregatedOrderItems;
      }, []);

    this.sendItToSqs(
      'analytics',
      {
        analyticsProvider: 'BRAZE',
        data: {
          purchases: segregatedOrderItems.map(item => ({
            'external_id': orderSet.customerId,
            'product_id': item.name.en,
            currency: currency.isoCode,
            price: Number(item.price),
            quantity: Number(item.quantity),
            time: new Date().toISOString(),
            properties: {
              brand: brand.name,
            }
          })),
        },
      },
    ).catch(err => console.error(err));
  }
}

module.exports = Customer;
