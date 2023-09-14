const BaseModel = require('../../base-model');
const moment = require('moment');
const momentTz = require('moment-timezone');
const { first, find } = require('lodash');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

const {
  countryConfigurationKeys,
  loyaltyTransactionType,
  walletInfoBarOptions,
  // streams,
  // streamActions,
} = require('../root/enums');
const { uuid } = require('../../lib/util');

const todayUnix = () =>
  moment(`${moment().format('YYYY-MM-DD')}T00:00:00Z`).unix();

class DiscoveryCredit extends BaseModel {
  constructor(db, context) {
    super(db, 'discovery_credits', context);
  }

  getCampaignVideoUrls() {
    return {
      en:
        'https://cofe-app-uploads.s3.eu-west-1.amazonaws.com/campaign-videos/vertical.mp4',
      ar:
        'https://cofe-app-uploads.s3.eu-west-1.amazonaws.com/campaign-videos/vertical.mp4',
      tr:
        'https://cofe-app-uploads.s3.eu-west-1.amazonaws.com/campaign-videos/vertical.mp4',
    };
  }

  async getCountryConfig(countryId) {
    const config = await this.getDiscoveryCreditConfigs(countryId);
    if (config) {
      const {
        enable,
        amount,
        amountPerOrder,
        noOfOrdersPerBrand,
        minOrderAmount,
        expiresOn,
        country,
        usableOnBrandCount,
      } = config;
      const expired = await this.isExpiredForCountry(countryId);
      if (enable === 'true' && !expired) {
        // const currency = await this.context.currency.getById(
        //   country.currencyId
        // );
        return {
          id: uuid.get(),
          amount,
          countryId,
          currencyId: country.currencyId,
          amountPerOrder,
          noOfOrdersPerBrand,
          minOrderAmount,
          expiresOn,
          createdAt: moment().format('YYYY-MM-DD HH:ii:ss'),
          usableOnBrandCount,
        };
      }
    }
    return null;
  }

  // eslint-disable-next-line complexity
  async getDiscoveryCreditConfigs(countryId) {
    const country = await this.context.country.getById(countryId);

    const configurationKeys = [
      countryConfigurationKeys.DISCOVERY_CREDITS_ENABLE,
      countryConfigurationKeys.DISCOVERY_CREDITS,
      countryConfigurationKeys.DISCOVERY_CREDITS_CONSUMEABLE_PER_ORDER,
      countryConfigurationKeys.DISCOVERY_CREDITS_X_ORDERS_PER_BRAND,
      countryConfigurationKeys.DISCOVERY_CREDITS_MIN_ORDER_AMOUNT,
      countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRES_IN_DAYS,
      countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRY_DATE,
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_ENABLE,
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_START_DATE,
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_END_DATE,
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_AMOUNT,
    ];

    const configurations = await this.context.countryConfiguration.getByKeys(
      configurationKeys,
      countryId
    );

    const configurationMap = new Map(
      configurations.map(i => [i.configurationKey, i.configurationValue])
    );

    const enable = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_ENABLE
    );
    let amount = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS
    ) || 0.0;
    const amountPerOrder = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_CONSUMEABLE_PER_ORDER
    ) || 0.0;
    const noOfOrdersPerBrand = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_X_ORDERS_PER_BRAND
    ) || 0;
    const minOrderAmount = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_MIN_ORDER_AMOUNT
    ) || 0;
    const expiryInDays = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRES_IN_DAYS
    ) || 0;
    const expiryDatePreffered = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRY_DATE
    ) || '';
    const isThereException = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_ENABLE
    ) || 'false';
    const exceptionStartDateString = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_START_DATE
    );
    const exceptionEndDateString = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_END_DATE
    );
    const exceptionAmount = configurationMap.get(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXCEPTION_AMOUNT
    );

    if (isThereException === 'true') {
      const currentDate = momentTz().tz(country.timeZoneIdentifier);
      const exceptionStartDate = momentTz.tz(
        exceptionStartDateString,
        country.timeZoneIdentifier
      );
      const exceptionEndDate = momentTz.tz(
        exceptionEndDateString,
        country.timeZoneIdentifier
      );
      if (exceptionStartDate <= currentDate && currentDate < exceptionEndDate) {
        amount = exceptionAmount;
      }
    }

    let expiresOn = 0;
    if (expiryDatePreffered && expiryDatePreffered.length > 1) {
      expiresOn = moment(expiryDatePreffered)
        .parseZone()
        .endOf('day')
        .unix();
    }
    if (expiresOn === 0 && Number(expiryInDays) > 0) {
      expiresOn =
        moment()
          .add(Number.parseInt(expiryInDays, 10), 'days')
          .endOf('day')
          .unix() +
        moment().utcOffset() * 60;
    }
    if (moment.unix(expiresOn).isBefore(moment())) return null;
    return {
      enable: enable ? enable : 'false',
      amount: Number(amount),
      amountPerOrder: Number(amountPerOrder),
      noOfOrdersPerBrand: Number(noOfOrdersPerBrand),
      minOrderAmount: Number(minOrderAmount),
      expiryInDays: Number(expiryInDays),
      expiryDatePreffered,
      expiresOn,
      country,
      usableOnBrandCount: Math.floor(Number(amount) / Number(amountPerOrder)),
    };
  }

  async rewardDiscoveryredits(customerId, countryId) {
    const errors = [];
    let added = false;

    const isCustomerRegisteredBefore = await this.context
      .customerAccountDeletionRequest
      .isCustomerRegisteredBefore({ customerId });

    if (isCustomerRegisteredBefore) {
      console.log(`
        User with user ID ${customerId} is not eligible to receive DC
        because he/she has deleted his/her account before.
      `);
      return { errors, added };
    }

    const discoveryCredit = await this.getByCustomerAndCountryId(
      customerId,
      countryId
    );
    if (customerId && countryId) {
      if (discoveryCredit === undefined) {
        const config = await this.getDiscoveryCreditConfigs(countryId);
        if (config) {
          const {
            enable,
            amount,
            amountPerOrder,
            noOfOrdersPerBrand,
            minOrderAmount,
            expiresOn,
            country,
          } = config;

          if (enable === 'true') {
            if (amount && Number(amount) > 0) {
              // await this.context.walletAccount.getAccounts(customerId);

              // eslint-disable-next-line max-depth
              try {
                added = true;
                await this.save({
                  customerId,
                  countryId,
                  currencyId: country.currencyId,
                  amount,
                  amountPerOrder,
                  noOfOrdersPerBrand,
                  minOrderAmount,
                  expiresOn,
                });

                await this.context.loyaltyTransaction.credit(
                  `${customerId}_${amount}_DISCOVERY_CREDITS_${todayUnix()}`,
                  loyaltyTransactionType.DISCOVERY_CREDITS,
                  customerId,
                  amount,
                  country.currencyId
                );
              } catch (err) {
                SlackWebHookManager.sendTextToSlack(
                  `WARNING: Discovery credits save failed for user ${customerId} because of unique key constraint`
                );
                console.log(
                  `Discovery credits save error for country ${countryId}`,
                  err
                );
              }
            } else {
              console.log(
                `Discovery credits are not set or set as 0 for country ${countryId}`
              );
            }
          } else {
            console.log(
              `Discovery credits are disabled for country ${countryId}`
            );
          }
        } else {
          console.log(
            `Discovery credits are expired for country ${countryId}`
          );
        }
      } else {
        console.log(
          `Discovery credits are already added for customer ${customerId}`
        );
      }
    } else {
      console.log(
        'rewardDiscoveryredits: Missing customerId or countryId',
        customerId,
        countryId
      );
    }

    return { errors, added };
  }

  async getByCustomerAndCurrencyId(customerId, currencyId) {
    const discoveryCredit = first(
      await this.getAllMainDb()
        .where('customer_id', customerId)
        .where('currency_id', currencyId)
        .orderBy('created_at', 'desc')
    );
    if (discoveryCredit) {
      const enabled = await this.isEnabledForCountry(discoveryCredit.countryId);
      if (!enabled) {
        return null;
      }
      if (await this.isExpiredForCountry(discoveryCredit.countryId)) {
        return null;
      }
      await this.replaceDiscoveryCreditExpireTimeWithCountryConfig(discoveryCredit);
    }
    return discoveryCredit;
  }

  async getByCustomerAndCountryId(customerId, countryId) {
    const discoveryCredit = first(
      await this.getAllMainDb()
        .where('customer_id', customerId)
        .where('country_id', countryId)
        .orderBy('created_at', 'desc')
    );
    if (discoveryCredit) {
      const enabled = await this.isEnabledForCountry(discoveryCredit.countryId);
      if (!enabled) {
        return null;
      }
      if (await this.isExpiredForCountry(discoveryCredit.countryId)) {
        return null;
      }
      await this.replaceDiscoveryCreditExpireTimeWithCountryConfig(discoveryCredit);

      discoveryCredit.usableOnBrandCount = Math.floor(
        discoveryCredit.amount / discoveryCredit.amountPerOrder
      );
    }
    return discoveryCredit;
  }
  async getByCustomerId(customerId) {
    let discoveryCredits = await this.getAllMainDb()
      .where('customer_id', customerId)
      .orderBy('created_at', 'desc');

    discoveryCredits = await Promise.all(
      discoveryCredits.map(async dc => {
        dc.expiresOn = await this.getDiscoveryCreditExpiryTime(dc.countryId);
        if (dc.expiresOn === 0 || moment.unix(dc.expiresOn).isBefore(moment())) return null;
        return dc;
      })
    );
    discoveryCredits = discoveryCredits.filter(n => n);
    return discoveryCredits;
  }

  async replaceDiscoveryCreditExpireTimeWithCountryConfig(discoveryCredit) {
    discoveryCredit.expiresOn = await this.getDiscoveryCreditExpiryTime(
      discoveryCredit.countryId
    );
  }

  async isExpiredForCountry(countryId) {
    const timeZoneIdentifier =
      await this.context.country.getTimezoneIdentifier(countryId);
    const countryConfig = await this.context.countryConfiguration.getByKey(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRY_DATE,
      countryId
    );
    if (timeZoneIdentifier && countryConfig && countryConfig.configurationValue) {
      const expiresOn = countryConfig.configurationValue;
      return this.getMomentTzWithExpiresOnAndTimeZone(
        expiresOn,
        timeZoneIdentifier
      ).isBefore(moment());
    }
    return true;
  }

  getMomentTzWithExpiresOnAndTimeZone(expiresOn, timeZoneIdentifier) {
    return momentTz.tz(
      expiresOn + 'T23:59:59',
      timeZoneIdentifier
    );
  }

  async applicableDiscoveryCredit({ brandId, customerId, countryId }) {
    const defaultConfig = await this.getDiscoveryCreditConfigs(countryId);
    const customer = await this.context.customer.getById(customerId);
    if (customer && countryId) {
      const dc = await this.getByCustomerAndCountryId(customerId, countryId);
      if (dc) {
        const redemptionCount = await this.context.discoveryCreditRedemption.countUsedByBrand(
          dc.id,
          brandId
        );
        if (redemptionCount < Number(dc.noOfOrdersPerBrand)) {
          dc.expiresOn = await this.getDiscoveryCreditExpiryTime(dc.countryId);
          return dc;
        }
      }

      return null;
    }

    if (defaultConfig && defaultConfig.enable === 'true') {
      return {
        id: uuid.get(),
        amount: defaultConfig.amount,
        countryId,
        currencyId: defaultConfig.country.currencyId,
        amountPerOrder: defaultConfig.amountPerOrder,
        noOfOrdersPerBrand: defaultConfig.noOfOrdersPerBrand,
        minOrderAmount: defaultConfig.minOrderAmount,
        expiresOn: defaultConfig.expiresOn,
        createdAt: moment(),
      };
    }
    return null;
  }

  async eligibleDiscoveryCreditForBrand({
    customerId,
    brandLocationId,
    total,
  }) {
    const discoveryCreditUsed = { credits: 0, error: null };
    if (customerId && brandLocationId && total && Number(total) > 0) {
      const brandLocation = await this.context.brandLocation.getById(
        brandLocationId
      );
      if (brandLocation) {
        const brand = await this.context.brand.getById(brandLocation.brandId);
        if (brand) {
          const country = await this.context.country.getById(brand.countryId);
          if (country) {
            const discoveryCredit = await this.getByCustomerAndCountryId(
              customerId,
              brand.countryId
            );
            // eslint-disable-next-line max-depth
            if (discoveryCredit) {
              const redemptionCount = await this.context.discoveryCreditRedemption.countUsedByBrand(
                discoveryCredit.id,
                brand.id
              );

              const accounts =
                (await this.context.walletAccount.getAccounts(customerId)) ||
                [];

              const currentAccount = find(
                accounts,
                a => a.currencyId === country.currencyId
              );
              // eslint-disable-next-line max-depth
              if (
                currentAccount &&
                Number(currentAccount.discoveryAmount) >=
                  Number(discoveryCredit.amountPerOrder) &&
                Number(redemptionCount) <
                  Number(discoveryCredit.noOfOrdersPerBrand)
              ) {
                // eslint-disable-next-line max-depth
                if (
                  // elgible if total order value is greater than/equal min order value
                  Number(total) >= Number(discoveryCredit.minOrderAmount) &&
                  // elgible if total order value is greater than/equal consumeable amount per order
                  Number(total) >= Number(discoveryCredit.amountPerOrder)
                ) {
                  discoveryCreditUsed.credits = Number(
                    discoveryCredit.amountPerOrder
                  );
                }
              }
            }
          }
        }
      }
    }
    return discoveryCreditUsed;
  }

  // async showInfoBarOnMobile({ id: discoveryCreditId, customerId }) {
  async showInfoBarOnMobile() {
    const message = walletInfoBarOptions.ADDED_REMINDER;
    // const config = await this.getCountryConfig(countryId);
    // we will implement a logic to display this info bar on mobile
    // e.g. we will check how many times customer checks his wallet
    // doesnt matter how many times customers check in a day, we will take it as once
    // customers would see 3,4,5 or 6 times (we will decide the number laters). this number are days actually
    // these can be consective as well as non-consective days.
    // if (customerId && discoveryCreditId) {
    //   const addedRemindedSeenPerDay = await this.context.userActivityLog.getAllUserByStreamAndActionGroupByDay(
    //     {
    //       userId: customerId,
    //       streamId: discoveryCreditId,
    //       stream: streams.DISCOVERY_CREDIT_ADDED_REMINDER,
    //       action: streamActions.VIEW,
    //     }
    //   );

    //   if (
    //     addedRemindedSeenPerDay &&
    //     Array.isArray(addedRemindedSeenPerDay) &&
    //     addedRemindedSeenPerDay.length < 3
    //   ) {
    //     // checking for less than 3 because we want to show added reminder only 3 times
    //     // note that in one day we will assume just once no matter how many time custmoer see
    //     try {
    //       await this.context.userActivityLog.create({
    //         streamId: discoveryCreditId,
    //         stream: streams.DISCOVERY_CREDIT_ADDED_REMINDER,
    //         action: streamActions.VIEW,
    //       });
    //     } catch (err) {}
    //     return walletInfoBarOptions.ADDED_REMINDER;
    //   }

    //   const { cdate } = first(addedRemindedSeenPerDay);

    //   const lastSeenDate = moment(cdate);
    //   const now = moment(new Date()); // todays date

    //   if (lastSeenDate.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')) {
    //     message = walletInfoBarOptions.ADDED_REMINDER;
    //   }

    //   const duration = moment.duration(now.diff(lastSeenDate));

    //   let days = duration.asDays();
    //   if (days < 0) {
    //     days *= -1;
    //   }

    //   if (days >= 30) {
    //     // greater than or equal to 30 days - because we will remind customer at 30th or after 30 days
    //     // that he/she still have discovery credits to use
    //     message = walletInfoBarOptions.REMAINING_REMINDER;
    //   }
    // } else {
    //   message = walletInfoBarOptions.PUBLIC_REMINDER;
    // }
    // if (customerId) {
    //   switch (message) {
    //     case walletInfoBarOptions.ADDED_REMINDER:
    //       try {
    //         await this.context.userActivityLog.create({
    //           streamId: discoveryCreditId,
    //           stream: streams.DISCOVERY_CREDIT_ADDED_REMINDER,
    //           action: streamActions.VIEW,
    //         });
    //       } catch (err) {}
    //       break;
    //     case walletInfoBarOptions.REMAINING_REMINDER:
    //       try {
    //         await this.context.userActivityLog.create({
    //           streamId: discoveryCreditId,
    //           stream: streams.DISCOVERY_CREDIT_REMAINING_REMINDER,
    //           action: streamActions.VIEW,
    //         });
    //       } catch (err) {}
    //       break;
    //     default:
    //       break;
    //   }
    // }

    return message;
  }

  async isEnabledForCountry(countryId) {
    return countryId
      ? ((await this.context.countryConfiguration
        .getByKey(
          countryConfigurationKeys.DISCOVERY_CREDITS_ENABLE,
          countryId)
      )?.configurationValue === 'true')
      : false;
  }

  async getDiscoveryCreditExpiryTime(countryId) {
    const enabled = await this.isEnabledForCountry(countryId);
    if (!enabled) return 0;
    const expiryDatePreffered = await this.context.countryConfiguration.getByKey(
      countryConfigurationKeys.DISCOVERY_CREDITS_EXPIRY_DATE,
      countryId
    );

    const timeZoneIdentifier =
      await this.context.country.getTimezoneIdentifier(countryId);
    if (timeZoneIdentifier && expiryDatePreffered && expiryDatePreffered.configurationValue) {
      return this.getMomentTzWithExpiresOnAndTimeZone(
        expiryDatePreffered.configurationValue,
        timeZoneIdentifier
      ).unix();
    }
    return 0;
  }

  async addDiscoveryCreditsForAllEnabledCountries(customerId) {
    const activeCountries = await this.context.countryConfiguration.getByKeyValue('DISCOVERY_CREDITS_ENABLE', 'true');
    for (const activeCountry of activeCountries) {
      await this.rewardDiscoveryredits(customerId, activeCountry.countryId);
    }
  }
}

module.exports = DiscoveryCredit;
