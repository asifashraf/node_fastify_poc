const moment = require('moment');
const redis = require('../../../redis');
const { getExtraFields } = require('../customer/utils');
const { customerAddressType, countryConfigurationKeys } = require('../root/enums');
const { countryConfigsKey } = require('../../../redis/keys');
const { saveCachedLoyaltyTiers } = require('../loyalty-tier/redis-helper');
const { getCachedLoyaltyTiers } = require('../loyalty-tier/redis-helper');
const { calculateLoyaltyTiersKey } = require('../loyalty-tier/redis-helper');
const { dailyOrdersReportsError, weeklyReportsError, monthlyReportsError, careTeamReportsError } = require('./enums');
const { map, uniq, assign, sortBy, omit } = require('lodash');
const { gitRevision, isNullOrUndefined } = require('../../lib/util');
const { addLocalizationField, formatError } = require('../../lib/util');
const { getReferralUrl } = require('../../lib/dynamic-url');
const {
  brandStatus,
  brandLocationStatus,
  statusTypes,
  couponStatus,
  paymentProvider,
  uILayoutType,
  couponValidationError,
  loyaltyBonusTypes,
  bankStatus,
  bankCardStatus,
  firstOrdersType,
  walletInfoBarOptions,
} = require('../root/enums');
const { countryCurrencyLookupKey } = require('../../../redis/keys');
const { paymentSchemes } = require('../../payment-service/enums');
const { getFolderFileList } = require('../../lib/aws-s3');
const { isProd, env, redisTimeParameter } = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

module.exports = {
  Query: {
    version() {
      return gitRevision();
    },
    async customer(root, { id }, context) {
      const auth = context.auth;
      if (context.auth.authProvider === 'authentication-service') {
        if (auth.id !== id) {
          throw new Error('Permission Denied !'); // [attack_scope]
        }
      } else if (context.auth.authProvider === 'firebase') {
        context.checkPermission('customer:view', 'customer');
      } else {
        throw new Error('Permission Denied !!!'); // [attack_scope]
      }
      console.log(`${new Date()} ::log:: ${id}`);
      let customer = null;
      try {
        customer = await context.customer.getById(id);
      } catch (err) {
        console.log(`${new Date()} ::log:: ${id}`, err);
      }
      return customer;
    },
    async getCustomerByAuth(root, args, context) {
      return context.customer.getById(context.auth.id);
    },
    async customerByAuth(root, args, context) {
      const customerId = context.auth.id;
      let authentication;
      const customer = await context.customer.getById(customerId);
      if (context.auth.authProvider === 'firebase') {
        authentication = await context.internalAuthService.generateToken(
          customer
        );
      }
      return {
        ...customer,
        authentication
      };
    },
    currentRewardProgramsDetailsByAuth(root, { brandId }, context) {
      return context.customer.getCurrentRewardProgramsDetails(
        context.auth.id,
        brandId
      );
    },
    customerRewardProgramDetailsByCountry(
      root,
      { countryId, brandId },
      context
    ) {
      return context.customer.getCustomerRewardProgramDetailsByCountry(
        countryId,
        brandId
      );
    },
    walletByAuth(root, args, context) {
      return context.customer.getWallet(context.auth.id);
    },
    getWalletAccountByCountryCode(root, { countryCode }, context) {
      return context.walletAccount.getWalletAccountByCountryCode(countryCode);
    },
    async getAccountLiteByCountryId(root, { countryId }, context) {
      return context.walletAccount.getAccountLiteByCountryId(countryId);
    },
    async cardTokensByAuth(root, { countryIso }, context) {
      let activePaymentProvider = paymentProvider.CHECKOUT;
      if (countryIso) {
        const country = await context.country.getByIsoCode(countryIso);
        const dbConfig = await context.countryConfiguration.getByKey(
          countryConfigurationKeys.CARD_SAVE_PROVIDER,
          country.id
        );
        activePaymentProvider = dbConfig.configurationValue ||
          paymentProvider.CHECKOUT;
      }
      return context.paymentService.getCustomerSavedCardTokens({
        paymentProvider: activePaymentProvider,
        customerId: context.auth.id,
      });
    },
    notificationSettingsByAuth(root, args, context) {
      return context.customer.getById(context.auth.id);
    },
    getAddressesByAuth(root, args, context) {
      return Promise.all([
        context.customerAddress.getByCustomer(context.auth.id),
        context.addressField.getAll(),
      ]).then(([addresses, addressFields]) =>
        addresses.map(address => {
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
        })
      );
    },
    getCustomerAddressesInFulfillmentRadius(
      root,
      { brandLocationId, fulfillmentType },
      context
    ) {
      return Promise.all([
        context.customerAddress.getByBrandLocationFulfillmentRadius(
          brandLocationId,
          fulfillmentType,
        ),
        context.addressField.getAll(),
      ]).then(([addresses, addressFields]) =>
        addresses.map(address => {
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
        })
      );
    },
    carsByAuth(root, args, context) {
      return context.customerCar.getByCustomer(context.auth.id);
    },
    deviceMetadata(root, { customerId, deviceId }, context) {
      return context.deviceMetadata.getDeviceMetadataByCustomerIdAndDeviceId(
        customerId,
        deviceId
      );
    },
    allergens(root, args, context) {
      // this query returns public information
      return context.allergen.getAll();
    },
    async brandLocation(root, { id }, context) {
      // this query returns public information
      return addLocalizationField(
        await context.brandLocation.getById(id),
        'name'
      );
    },
    async brandLocations(
      root,
      { countryId, filters = { status: brandLocationStatus.ACTIVE } },
      context
    ) {
      // this query returns public information
      return addLocalizationField(
        await context.brandLocation.getAll(countryId, filters),
        'name'
      );
    },
    async brandLocationsByCountryId(
      root,
      { countryId, filters = { status: brandLocationStatus.ACTIVE } },
      context
    ) {
      return addLocalizationField(
        await context.brandLocation.getByCountryId(countryId, filters),
        'name'
      );
    },
    async brandLocationsPaged(
      root,
      { countryId, filters = { status: statusTypes.ACTIVE }, paging },
      context
    ) {
      const auth = context.auth;
      if (auth.isVendorAdmin) {
        if (filters.brandId && auth.isBrandAdmin(filters.brandId)) {
          return context.brandLocation.getAllPaged(countryId, filters, paging);
        }
        return; // [attack_scope]
      }
      return context.brandLocation.getAllPaged(countryId, filters, paging);
    },
    async getBrandLocationEndOfDayReport(root, { brandLocationId }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      if (admin) {
        if (auth.isVendorAdmin) {
          const brandLocation = await context.brandLocation.getById(brandLocationId);
          if (auth.isBranchAdmin(brandLocation) || auth.isBrandAdmin(brandLocation.brandId)) {
            hasPermission = true;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) {
        throw new Error('Permission Denied !!'); // [attack_scope]
      }
      return context.brandLocation.getBrandLocationEndOfDayReport(brandLocationId);
    },
    async brandLocationsAll(
      root,
      { brandId },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      if (admin && auth.isVendorAdmin) {
        if (brandId && auth.isBrandAdmin(brandId)) {
          hasPermission = true;
        }
      }
      if (!hasPermission) return; // [attack_scope]
      // this query returns public information
      const filters = { brandId, status: 'ALL' };
      return addLocalizationField(
        await context.brandLocation.getAll(null, filters),
        'name'
      );
    },
    async brandLocationsThatDeliver(
      root,
      { filters = { status: brandLocationStatus.ACTIVE } },
      context
    ) {
      return addLocalizationField(
        await context.brandLocation.getDeliveryFulfillmentLocations(filters),
        'name'
      );
    },
    async getAddressFromGeocoding(root, { location, preferredLanguage = 'EN' }, context) {
      /**
       * Validate
       *  Is it a serviced country ( with MultiPolygons in countries table)
       *  request to geoapi
       *  format and return data
       */
      /*
      const validationResult = await context.country.validateGeocoding(location);

      if (validationResult.length > 0)
        return formatError(validationResult, location);
      */
      return context.country.getAddressFromGeocoding(location, preferredLanguage);
    },
    getDeliveryStatusByShortCode(root, { shortCode }, context) {
      return context.orderSet.getDeliveryStatusByShortCode(shortCode);
    },
    async orderSet(root, { id }, context) {
      if (!context.auth || (!context.auth.uid && !context.auth.id))
        throw new Error('Insufficient privileges !');
      let orderResult = {};
      if (context.auth.authProvider === 'authentication-service') {
        // from a customer
        const [customer, orderSet] = await Promise.all([context.customer.getById(context.auth.id), context.orderSet.getById(id)]);
        if (!(customer && orderSet && orderSet.customerId === customer.id)) {
          throw new Error('Permission Denied !'); // [attack_scope]
        }
        orderResult = orderSet;
      } else if (context.auth.authProvider === 'firebase') {
        // from admin-vendor user
        const [admin, orderSet] = await Promise.all([context.admin.getByAuthoId(context.auth.id), context.orderSet.getById(id)]);
        if (admin && orderSet) {
          if (context.auth.isVendorAdmin) {
            const brandLocation = await context.brandLocation.getById(orderSet.brandLocationId);
            if (context.auth.isBranchAdmin(orderSet.brandLocationId)) {
              orderResult = orderSet;
            } else if (brandLocation && context.auth.isBrandAdmin(brandLocation.brandId)) {
              orderResult = orderSet;
            } else {
              throw new Error('Permission Denied !!'); // [attack_scope]
            }
          } else {
            // from general admin without portals
            context.checkPermission('order:view', 'orderSet.getById');
            orderResult = orderSet;
          }
        } else {
          throw new Error('Permission Denied !!!'); // [attack_scope]
        }
      } else {
        throw new Error('Permission Denied !!!!'); // [attack_scope]
      }
      return orderResult;
    },
    orderSetForCallbacks(root, { id }, context) {
      return context.orderSet.getById(id);
    },
    orderSets(root, args, context) {
      return context.orderSet.getAllPaid(
        args.searchTerm,
        args.filterType,
        args.paging,
        args.dateRange,
        args.brandLocationId,
        args.brandId,
        args.countryId,
        undefined,
        'orderSets',
        args.fulfillmentType,
        args.couponId,
        args.couponCode
      );
    },
    orderSetsByAuth(root, args, context) {
      return context.orderSet.getAllByCustomer(args);
    },
    async orderSetsLite(root, args, context) {
      const permission = await context.admin.validatePermissionByFilters(args, 'order:view');
      if (!permission) {
        return;
      }
      return context.orderSet.getOrderSetListFromLiteView(args);
    },
    async orderSetsLiteTotalItemCount(root, args, context) {
      const permission = await context.admin.validatePermissionByFilters(args, 'order:view');
      if (!permission) {
        return;
      }
      return context.orderSet.getOrderSetListTotalItemCountForLiteView(args);
    },
    orderSetStatusTotal(root, args, context) {
      return context.orderSet.orderSetStatusTotal(
        args.searchTerm,
        args.dateRange,
        args.brandLocationId,
        args.brandId,
        args.countryId,
        undefined,
        'orderSetStatusTotal',
        args.fulfillmentType,
        args.couponId,
        args.couponCode
      );
    },
    orderQueueSets(root, args, context) {
      return context.orderSet.getAllPaid(
        undefined,
        args.groupFilterType,
        args.paging,
        undefined,
        args.brandLocationId,
        args.brandId,
        undefined,
        args.curDate,
        'orderQueueSets',
        args.fulfillmentType
      );
    },
    orderQueueSetStatusTotal(root, args, context) {
      return context.orderSet.orderSetStatusTotal(
        undefined,
        undefined,
        args.brandLocationId,
        args.brandId,
        undefined,
        args.curDate,
        'orderQueueSetStatusTotal'
      );
    },
    delayedOrderSets(root, args, context) {
      return context.orderSet.getAllPaid(
        args.searchTerm,
        args.filterType,
        args.paging,
        args.dateRange,
        args.brandLocationId,
        args.brandId,
        args.countryId,
        undefined,
        'delayedOrderSets',
        args.fulfillmentType,
        args.couponId,
        args.couponCode
      );
    },
    async delayedOrderSetsLite(root, args, context) {
      const permission = await context.admin.validatePermissionByFilters(args, 'order:view');
      if (!permission) {
        return;
      }
      return context.orderSet.getDelayedOrderSetListFromLiteView(args);
    },
    async delayedOrderSetsLiteTotalItemCount(root, args, context) {
      const permission = await context.admin.validatePermissionByFilters(args, 'order:view');
      if (!permission) {
        return;
      }
      return context.orderSet.getDelayedOrderSetListTotalItemCountForLiteView(
        args
      );
    },
    activeOrderSets(root, args, context) {
      return context.orderSet.getAllActive(args.paging);
    },
    orderSetsForShortCode(root, { shortCode }, context) {
      return context.orderSet.getByShortCode(shortCode);
    },
    async locationsInRadius(root, args, context) {
      return addLocalizationField(
        await context.brandLocation.locationsInRadius(args),
        'name'
      );
    },
    locationsInRadiusLite(root, args, context) {
      return context.brandLocation.locationsInRadiusLite(args);
    },
    ngLocationsInRadiusLite(root, args, context) {
      return context.brandLocation.ngLocationsInRadiusLite(args);
    },
    async getBrandLocationsWithBBox(root, args, context) {
      return addLocalizationField(
        await context.brandLocation.getBrandLocationsWithBBox(args),
        'name'
      );
    },
    async locationsForHomeScreen(
      root,
      {
        neighborhoodId,
        hasDelivery,
        location,
        paging,
        filters = { status: brandLocationStatus.ACTIVE },
      },
      context
    ) {
      return addLocalizationField(
        await context.brandLocation.locationsForHomeScreen(
          neighborhoodId,
          hasDelivery,
          location,
          paging,
          filters
        ),
        'name'
      );
    },
    async locationsForSearchScreen(
      root,
      {
        countryId,
        searchTerm,
        location,
        paging,
        filters = { status: brandLocationStatus.ACTIVE },
      },
      context
    ) {
      return addLocalizationField(
        await context.brandLocation.locationsForSearchScreen(
          countryId,
          searchTerm,
          location,
          paging,
          filters
        ),
        'name'
      );
    },
    async locationsForPickup(
      root,
      {
        brandId,
        location,
        paging,
        filters = { status: brandLocationStatus.ACTIVE },
      },
      context
    ) {
      return addLocalizationField(
        await context.brandLocation.locationsForPickup(
          brandId,
          location,
          paging,
          filters
        ),
        'name'
      );
    },
    async brand(root, { id }, context) {
      let brandResult = {};
      if (context.auth.authProvider === 'firebase') {
        // from admin-vendor user
        const [admin, brand] = await Promise.all([context.admin.getByAuthoId(context.auth.id), context.brand.getById(id)]);
        if (admin && brand) {
          if (context.auth.isVendorAdmin) {
            let existBranch = false;
            if (context.auth.brandAdminInfo.branchAdminList && context.auth.brandAdminInfo.branchAdminList.length > 0) {
              for (const branchId of context.auth.brandAdminInfo.branchAdminList) {
                const branch = await context.brandLocation.getById(branchId);
                if (branch.brandId === brand.id) {
                  existBranch = true;
                }
              }
            }
            if (existBranch) {
              brandResult = brand;
              brandResult = omit(brand, [
                'posId',
                'posType',
                'posUrl',
                'posKey',
                'posSecret',
              ]);
            } else if (brand && context.auth.isBrandAdmin(brand.id)) {
              brandResult = brand;
            } else {
              throw new Error('Permission Denied !!'); // [attack_scope]
            }
          } else {
            // from general admin without portals
            context.checkPermission('brand:view', 'brand');
            brandResult = brand;
          }
        } else {
          throw new Error('Permission Denied !!!'); // [attack_scope]
        }
      } else {
        // this query is public but there are secret information so this process block them
        const brand = await context.brand.getById(id);
        if (brand) {
          brand.isPos = false;
          brandResult = omit(brand, [
            'posId',
            'posType',
            'posUrl',
            'posKey',
            'posSecret',
          ]);

        }
      }
      if (brandResult) {
        return addLocalizationField(
          addLocalizationField(brandResult, 'name'),
          'brandDescription',
        );
      } else {
        return null;
      }
    },
    async brands(
      root,
      { countryId, filters = { status: 'ALL' }, paging, catering },
      context
    ) {
      return addLocalizationField(
        addLocalizationField(
          await context.brand.getAll(countryId, filters, catering, paging),
          'name'
        ),
        'brandDescription'
      );
    },
    async activeAndInactiveBrandsByCountryId(
      root, { countryId }, context
    ) {
      return addLocalizationField(
        addLocalizationField(
          await context.brand.getActiveAndInactiveBrandsByCountryId(countryId),
          'name'
        ),
        'brandDescription'
      );
    },
    async brandsByCountryId(
      root,
      { countryId, filters = { status: brandStatus.ACTIVE }, paging, catering },
      context
    ) {
      return addLocalizationField(
        addLocalizationField(
          await context.brand.getAllByCountryId(
            countryId,
            filters,
            catering,
            paging
          ),
          'name'
        ),
        'brandDescription'
      );
    },
    async brandsByCountryIso(
      root,
      {
        countryIso,
        filters = { status: brandStatus.ACTIVE },
        paging,
        catering,
      },
      context
    ) {
      return addLocalizationField(
        addLocalizationField(
          await context.brand.getAllByCountryIso(
            countryIso,
            filters,
            catering,
            paging
          ),
          'name'
        ),
        'brandDescription'
      );
    },
    async brandsForDiscoveryCreditsByCountryId(
      root,
      { countryIso, paging, location, radius },
      context
    ) {
      const customerId = context.auth.id;
      const country = await context.country.getByIsoCode(countryIso);
      if (country) {
        return context.brandLocation.brandsForDiscoveryCreditsByCountryId({
          countryId: country.id,
          paging,
          location,
          radius,
          customerId,
        });
      }
    },
    async discoveryCredit(root, { countryIso, addIfNotFound }, context) {
      let added = false;
      const customerId = context.auth.id;
      const country = await context.country.getByIsoCode(countryIso);
      // TODO Implemented as a stop-gap before making the URLs dynamic
      const campaignVideoUrls = context.discoveryCredit.getCampaignVideoUrls();
      if (country) {
        const discoveryCredit = await context.discoveryCredit.getCountryConfig(
          country.id
        );
        if (customerId) {
          if (addIfNotFound) {
            // Should be set as FALSE always by the FE/ADMIN PORTAL TEAM, mobile team shuold always set as true.
            // If the call is coming from mobile/addIfNotFound is set as true. we will add credits automatically if enabled in that country.
            const {
              added: addedInWallet,
            } = await context.discoveryCredit.rewardDiscoveryredits(
              customerId,
              country.id
            );
            added = addedInWallet;
          }

          const givenDiscoveryCredit = await context.discoveryCredit.getByCustomerAndCountryId(
            customerId,
            country.id
          );
          if (givenDiscoveryCredit) {
            return {
              // eslint-disable-next-line no-unneeded-ternary
              isEnabled: discoveryCredit ? true : false,
              discoveryCredit: givenDiscoveryCredit,
              campaignVideoUrls,
              added,
              showInfoBar: added
                ? walletInfoBarOptions.ADDED_REMINDER
                : walletInfoBarOptions.REMAINING_REMINDER,
            };
          }
        } else if (discoveryCredit) {
          return {
            isEnabled: true,
            discoveryCredit,
            added,
            campaignVideoUrls,
            showInfoBar: walletInfoBarOptions.PUBLIC_REMINDER,
          };
        }
      }
      return {
        isEnabled: false,
        added,
        campaignVideoUrls,
        showInfoBar: walletInfoBarOptions.NONE,
      };
    },
    async countryWallet(
      root,
      { countryIso, paging, location, radius },
      context
    ) {
      const customerId = context.auth.id;
      const country = await context.country.getByIsoCode(countryIso);
      if (country) {
        // await context.discoveryCredit.rewardDiscoveryredits(
        //   customerId,
        //   country.id
        // );

        return context.customer.getCountryWallet({
          countryId: country.id,
          paging,
          location,
          radius,
          customerId,
        });
      }
      return null;
    },

    async fetchCateringBrands(
      root,
      { countryIso, filters = { status: brandStatus.ACTIVE }, paging },
      context
    ) {
      return addLocalizationField(
        addLocalizationField(
          await context.brand.getAllCateringBrands(countryIso, filters, paging),
          'name'
        ),
        'brandDescription'
      );
    },
    menu(root, { id }, context) {
      // this query returns public information
      return context.menu.getById(id);
    },
    menus(root, args, context) {
      // this query returns public information
      return context.menu.getAll();
    },
    menusByBrands(root, { brandIds }, context) {
      // this query returns public information
      return context.menu.getByBrands(brandIds);
    },
    getBrandLocationMenu(root, { brandLocationId }, context) {
      return context.brandLocation.calculateMenu(brandLocationId);
    },
    async neighborhoods(
      root,
      { countryId, countryIso, filters = { status: 'ALL' } },
      context
    ) {
      if (countryId || countryIso) {
        if (countryId) {
          return addLocalizationField(
            await context.neighborhood.getByCountryId(countryId, filters),
            'name'
          );
        }
        if (countryIso) {
          return addLocalizationField(
            await context.neighborhood.getByCountryIso(countryIso, filters),
            'name'
          );
        }
      }
      return addLocalizationField(await context.neighborhood.getAll(), 'name');
    },
    async neighborhood(root, args, context) {
      return addLocalizationField(
        await context.neighborhood.getById(args.id),
        'name'
      );
    },
    async cityNeighborhoods(
      root,
      { cityId, filters = { status: statusTypes.ACTIVE } },
      context
    ) {
      return addLocalizationField(
        await context.neighborhood.getByCity(cityId, filters),
        'name'
      );
    },
    currencies(root, { filters = { status: 'ALL' } }, context) {
      return context.currency.getAll(filters);
    },
    async currency(root, args, context) {
      return addLocalizationField(
        addLocalizationField(await context.currency.getById(args.id), 'symbol'),
        'subunitName'
      );
    },
    countries(root, { filters = { status: 'ALL' } }, context) {
      return context.country.getAll(filters);
    },
    async country(root, args, context) {
      return addLocalizationField(
        await context.country.getById(args.id),
        'name'
      );
    },
    async countryByCode(
      root,
      { code, filters = { status: statusTypes.ACTIVE } },
      context
    ) {
      // this query returns public information
      const country = await context.country.getByCode(code, filters);
      if (country) {
        return country;
      } else {
        throw new Error('Not Found.');
      }
    },
    cities(
      root,
      { countryId, countryIso, filters = { status: 'ALL' } },
      context
    ) {
      if (countryId || countryIso) {
        if (countryId) {
          return context.city.getByCountry(countryId, filters);
        }
        if (countryIso) {
          return context.city.getByCountryIso(countryIso, filters);
        }
      }
      return context.city.getAll();
    },
    countryCities(
      root,
      { countryId, filters = { status: statusTypes.ACTIVE } },
      context
    ) {
      return context.city.getByCountry(countryId, filters);
    },
    async city(root, args, context) {
      return addLocalizationField(await context.city.getById(args.id), 'name');
    },
    config(root, args, context) {
      return context.configuration.getCurrent();
    },
    coupon(root, { id }, context) {
      return context.coupon.getById(id);
    },
    customerCurrentLocation(root, { input }, context) {
      const customerId = context.auth.id;
      return context.customerCurrentLocationCache.getLatestCurrentLocation(
        customerId,
        input
      );
    },
    // TODO Deprecate this when new version hits >90 adoption
    async couponByCodeAndCustomer(
      root,
      { code, countryIso, paymentMethod },
      context
    ) {
      const customerId = context.auth.id;
      await context.coupon.referralCouponExist({
        couponCode: code,
        customerId,
      });
      const coupon = await context.coupon.getByCodeCountryIsoAndCustomerId(
        code,
        countryIso,
        customerId
      );
      const country = await context.country.getByCode(countryIso);
      if (!country) {
        return null;
      }
      if (coupon !== undefined && coupon !== null) {
        coupon.isValidForThisCustomer = await context.coupon.isValidForThisCustomer(
          code,
          customerId,
          country.id
        );
      }

      if (
        coupon &&
        coupon.allowedPaymentMethods &&
        coupon.allowedPaymentMethods.length > 0 &&
        (!paymentMethod ||
          !coupon.allowedPaymentMethods.includes(paymentMethod))
      ) {
        // only if payment method is selected
        // otherwise lets/we assume order would be paid through credits/giftcards
        if (paymentMethod) {
          return null;
        }
        // Coupon not applicable for given payment method
      }

      return coupon;
    },
    // eslint-disable-next-line complexity
    async couponByCodeAndCustomerWithSourceId(root, args, context) {
      const {
        code,
        countryIso,
        paymentMethod,
        sourceId,
        brandLocationId,
        order,
      } = args.couponInput;
      const customerId = context.auth.id;
      await context.coupon.referralCouponExist({
        couponCode: code,
        customerId,
      });
      let coupon = await context.coupon.getByCodeCountryIsoAndCustomerId(
        code,
        countryIso,
        customerId
      );
      const country = await context.country.getByCode(countryIso);
      if (!country) {
        coupon = null;
      }
      if (coupon !== undefined && coupon !== null) {
        coupon.isValidForThisCustomer = await context.coupon.isValidForThisCustomer(
          code,
          customerId,
          country.id
        );
      }

      if (
        coupon &&
        coupon.allowedPaymentMethods &&
        coupon.allowedPaymentMethods.length > 0 &&
        (!paymentMethod ||
          !coupon.allowedPaymentMethods.includes(paymentMethod))
      ) {
        // only if payment method is selected
        // otherwise lets/we assume order would be paid through credits/giftcards
        if (paymentMethod) {
          coupon = null;
        }
      }
      // use older coupon validation first
      const validCoupon = coupon;
      if (
        !validCoupon ||
        (validCoupon && validCoupon.isValidForThisCustomer === false)
      ) {
        return formatError(
          [couponValidationError.INVALID_COUPON_OR_INAPPLICABLE_PAYMENT_METHOD],
          args.couponInput
        );
      }

      // check if coupon is valid for vendor
      if (validCoupon && brandLocationId) {
        const isValidBrandCoupon = await context.coupon.isCouponAvailableForBrand(
          brandLocationId,
          validCoupon.id
        );
        if (!isValidBrandCoupon) {
          return formatError(
            [couponValidationError.INAPPLICABLE_VENDOR_FOR_COUPON],
            args.couponInput
          );
        }
        const brandLocation = await context.brandLocation.getById(
          brandLocationId
        );
        if (
          brandLocation &&
          validCoupon.onlyFirstOrdersFor === firstOrdersType.BRAND
        ) {
          let stats = {};
          if (validCoupon.onlyFirstOrders === true) {
            stats = await context.customerStats.getByCustomerForBrand(
              customerId,
              brandLocation.brandId
            );
          } else if (validCoupon.onlyFirstOrders === false) {
            stats = await context.customerStats.getByCustomerForBrandUsingParticularCoupon(
              customerId,
              brandLocation.brandId,
              validCoupon.id
            );
          }

          if (
            stats &&
            stats.totalOrders >= Number(validCoupon.firstOrdersRedemptionLimit)
          ) {
            return formatError(
              [couponValidationError.COUPON_ALREADY_CONSUMED_BY_VENDOR],
              args.couponInput
            );
          }
        }
      }

      // If payment method is saved card, then check if bank/card locked
      if (paymentMethod && paymentMethod === paymentSchemes.SAVED_CARD) {
        const isBankLocked =
          validCoupon.allowedBanks && validCoupon.allowedBanks.length > 0;
        const isBankCardLocked =
          validCoupon.allowedBankCards &&
          validCoupon.allowedBankCards.length > 0;
        // if bank or card locked, validate the lock
        if (isBankLocked || isBankCardLocked) {
          const customerCardInfo = await context.customerCardToken.getById(
            sourceId
          );
          if (!customerCardInfo) {
            return formatError(
              [couponValidationError.NON_EXISTING_CUSTOMER_CARD],
              args.couponInput
            );
          }
          if (isBankLocked) {
            for (let i = 0; i < validCoupon.allowedBanks.length; i++) {
              // eslint-disable-next-line no-await-in-loop
              const bank = await context.bank.getById(
                validCoupon.allowedBanks[i]
              );
              // eslint-disable-next-line max-depth
              if (!bank || (bank && bank.status === bankStatus.DISABLED)) {
                // Bank may be deleted or disabled at the time of voucher validation, just skip that bank
                continue;
              }
              // eslint-disable-next-line max-depth
              if (bank.hasUniqueIdentifier && bank.identifier) {
                // eslint-disable-next-line max-depth
                if (customerCardInfo.bin.startsWith(bank.identifier)) {
                  return { coupon: validCoupon };
                }
              }
              // is bank doesn't have a unique identifier, then it is just a wrapper for bank cards
            }
          }
          if (isBankCardLocked) {
            for (let i = 0; i < validCoupon.allowedBankCards.length; i++) {
              // eslint-disable-next-line no-await-in-loop
              const bankCard = await context.bankCard.getById(
                validCoupon.allowedBankCards[i]
              );
              // eslint-disable-next-line max-depth
              if (
                !bankCard ||
                (bankCard && bankCard.status === bankCardStatus.DISABLED)
              ) {
                // BankCard may be deleted or disabled at the time of voucher validation, just skip that bank card
                continue;
              }
              // eslint-disable-next-line max-depth
              if (customerCardInfo.bin === bankCard.identifier) {
                return { coupon: validCoupon };
              }
            }
          }
          // if bank or card lock cannot be verified, return this error
          return formatError(
            [couponValidationError.INAPPLICABLE_BANK_OR_CARD_FOR_COUPON],
            args.couponInput
          );
        }
      }

      if (order && validCoupon && validCoupon.id) {
        const errors = await context.coupon.checkOrderComponents(order, validCoupon);
        if (errors && errors.length > 0) {
          return formatError(errors);
        }
      }
      // if previous checks are ok and is not bank or card locked ,it is ok
      return { coupon: validCoupon };
    },
    async validateCoupon(root, { code, brandLocationId }, context) {
      const customerId = context.auth.id;
      await context.coupon.referralCouponExist({
        couponCode: code,
        customerId,
      });
      const coupon = await context.coupon.getByBrandLocationAndCustomerId(
        code,
        brandLocationId,
        customerId
      );
      if (coupon !== undefined && coupon !== null) {
        coupon.isValidForThisCustomer = await context.coupon.isValidForThisCustomer(
          code,
          customerId,
          null,
          brandLocationId
        );
      }
      return coupon;
    },
    coupons(
      root,
      {
        paging,
        countryId,
        searchTerm,
        isValid,
        filters = { status: couponStatus.ACTIVE },
      },
      context
    ) {
      const minCharLengthForSearch = 3;
      let validRequest = true;

      if (searchTerm && searchTerm.length < minCharLengthForSearch) {
        validRequest = false;
      }

      if (validRequest) {
        return context.coupon.getAll(
          paging,
          isValid,
          searchTerm,
          countryId,
          filters
        );
      }

      return [];
    },
    async loyaltyOrder(root, { id }, context) {
      if (!context.auth || (!context.auth.uid && !context.auth.id))
        throw new Error('Insufficient privileges !');
      let loyaltyOrderResult = {};
      if (context.auth.authProvider === 'authentication-service') {
        // from a customer
        const [customer, loyaltyOrder] = await Promise.all([context.customer.getById(context.auth.id), context.loyaltyOrder.getById(id)]);
        if (!(customer && loyaltyOrder && loyaltyOrder.customerId === customer.id)) {
          throw new Error('Permission Denied'); // [attack_scope]
        }
        loyaltyOrderResult = loyaltyOrder;
      } else if (context.auth.authProvider === 'firebase') {
        // from admin-vendor user
        const [admin, loyaltyOrder] = await Promise.all([context.admin.getByAuthoId(context.auth.id), context.loyaltyOrder.getById(id)]);
        if (admin && loyaltyOrder) {
          if (context.auth.isVendorAdmin) {
            throw new Error('Permission Denied'); // [attack_scope]
          } else {
            // from general admin without portals
            context.checkPermission('creditorders:access', 'loyaltyOrder');
            loyaltyOrderResult = loyaltyOrder;
          }
        } else {
          throw new Error('Permission Denied'); // [attack_scope]
        }
      } else {
        throw new Error('Permission Denied'); // [attack_scope]
      }
      return loyaltyOrderResult;
    },
    loyaltyOrders(root, { filters, paging }, context) {
      return context.loyaltyOrder.getAll(filters, paging);
    },
    customers(root, args, context) {
      const minCharLengthForSearch = 3;
      let validRequest = true;

      if (args.searchTerm && args.searchTerm.length < minCharLengthForSearch) {
        validRequest = false;
      }

      if (validRequest) {
        return context.customer.getAll(
          args.paging,
          args.loyaltyTierName,
          args.searchTerm,
          args.filters
        );
      }

      return [];
    },
    /*
    marketingNotification(root, { id }, context) {
      return { notification: context.marketingNotification.getById(id) };
    },
    marketingNotifications(root, { countryId, paging }, context) {
      return context.marketingNotification.getAll(countryId, paging);
    },
    */
    async getAllBrandsWithActiveRewards(
      root,
      {
        countryCode = 'KW',
        filters = { status: brandStatus.ACTIVE },
        catering,
      },
      context
    ) {
      return addLocalizationField(
        addLocalizationField(
          await context.brand.getAllWithActiveRewards(
            countryCode,
            filters,
            catering
          ),
          'name'
        ),
        'brandDescription'
      );
    },
    async getAllBrandsWithoutRewards(
      root,
      { countryId, filters = { status: brandStatus.ACTIVE }, catering },
      context
    ) {
      return addLocalizationField(
        addLocalizationField(
          await context.brand.getAllWithoutRewards(
            countryId,
            filters,
            catering
          ),
          'name'
        ),
        'brandDescription'
      );
    },
    rewards(
      root,
      { countryId, paging, filters = { status: 'ALL' } },
      context
    ) {
      return context.reward.getAllPaged(countryId, paging, filters);
    },
    groupAdmins(
      root,
      { email, groupId, paging, filters = { status: statusTypes.ACTIVE } },
      context
    ) {
      return context.admin.groupAdmins(email, groupId, paging, filters);
    },
    admins(root, args, context) {
      return context.admin.getAllPaged(args);
    },
    admin(root, { email }, context) {
      return context.admin.getAdminDetails(email);
    },
    async reward(root, { id }, context) {
      const reward = await context.reward.getById(id);
      if (reward && context.auth.authProvider === 'firebase') {
        // from admin-vendor user
        if (context.auth.isVendorAdmin) {
          throw new Error('Permission Denied'); // [attack_scope]
        }
      } else {
        throw new Error('Permission Denied'); // [attack_scope]
      }
      return addLocalizationField(
        addLocalizationField(reward, 'title'),
        'conversionName'
      );
    },
    rewardTier(root, { id }, context) {
      return context.rewardTier.getById(id);
    },
    rewardTierPerk(root, { id }, context) {
      return context.rewardTierPerk.getById(id);
    },
    rewardTierAllowedPerks(root, { tierId }, context) {
      return context.rewardTierPerk.rewardTierAllowedPerks(tierId);
    },
    transactionHistory(root, args, context) {
      return context.transaction.getByCustomer(args.customerId, args.paging);
    },
    getCustomerRewardProgramDetails(root, { rewardId }, context) {
      if (!context.auth.id) {
        return null;
      }
      return context.customer.getRewardProgramDetails(
        context.auth.id,
        rewardId
      );
    },
    getCustomerRewardProgramUsedPerks(root, { customerId, rewardId }, context) {
      return context.customerUsedPerk.getByCustomerIdAndRewardId(
        customerId,
        rewardId
      );
    },
    async getBrandLocationPriceRules(root, { brandLocationId }, context) {
      let brandLocationPriceRuleResult = {};
      if (context.auth.authProvider === 'firebase') {
        const [admin, brandLocationPriceRule] = await Promise.all([context.admin.getByAuthoId(context.auth.id), context.brandLocationPriceRule.getByBrandLocation(brandLocationId)]);
        if (admin && brandLocationPriceRule) {
          if (context.auth.isVendorAdmin) {
            // from admin-vendor user
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            if (brandLocation && context.auth.isBrandAdmin(brandLocation.brandId)) {
              brandLocationPriceRuleResult = brandLocationPriceRule;
            } else {
              throw new Error('Permission Denied'); // [attack_scope]
            }
          } else {
            brandLocationPriceRuleResult = brandLocationPriceRule;
          }
        } else {
          throw new Error('Permission Denied'); // [attack_scope]
        }
      } else {
        throw new Error('Permission Denied'); // [attack_scope]
      }
      return brandLocationPriceRuleResult;
    },
    banners(root, { countryId, countryCode, showInactive = false }, context) {
      if (countryId)
        return context.banner.getAllByCountryId(countryId, showInactive);
      return context.banner.getAllByCountryCode(countryCode, showInactive);
    },
    banner(root, { id }, context) {
      return context.banner.getById(id);
    },
    goldenCofe(root, { countryCode }, context) {
      return context.goldenCofe.getByCountryCode(countryCode);
    },
    forceUpdate(root, args, context) {
      return context.configuration.getCurrent();
    },
    loyaltyTier(root, { id }, context) {
      return context.loyaltyTier.getById(id);
    },
    async loyaltyTiers(root, { countryId, countryCode, status = 'ALL' }, context) {
      let loyaltyTiers;
      const accessKey = calculateLoyaltyTiersKey({ countryId, countryCode, status });
      const cachedData = await getCachedLoyaltyTiers(accessKey);
      if (cachedData) {
        return cachedData;
      }
      if (countryId || countryCode) {
        loyaltyTiers = await context.loyaltyTier.getAllByCountry({
          countryId,
          countryCode,
        }, status);
      } else {
        loyaltyTiers = await context.loyaltyTier.getAll(status);
      }

      loyaltyTiers.forEach(loyaltyTier => {
        /* Moved to DB
        if (loyaltyTier.customAmount) {
          // Hardcoded values for now
          loyaltyTier.minAmount = '1.000';
          loyaltyTier.maxAmount = '9999.000';
        }
        */
        if (
          loyaltyTier.loyaltyBonuses &&
          loyaltyTier.loyaltyBonuses.length === 1
        ) {
          if (
            loyaltyTier.loyaltyBonuses[0].type.toLowerCase() ===
            loyaltyBonusTypes.PERCENT.toLowerCase()
          ) {
            loyaltyTier.percentage = loyaltyTier.loyaltyBonuses[0].value;
            loyaltyTier.bonus =
              (parseInt(loyaltyTier.amount, 10) *
                loyaltyTier.loyaltyBonuses[0].value) /
              100;
          } else {
            loyaltyTier.flatAmount = loyaltyTier.loyaltyBonuses[0].value;
            loyaltyTier.bonus = loyaltyTier.loyaltyBonuses[0].value;
          }
        }
      });
      await saveCachedLoyaltyTiers(accessKey, loyaltyTiers);

      return loyaltyTiers;
    },
    async getloyaltyTierBonus(root, { id, amount }, context) {
      try {
        amount = parseFloat(amount);
        const loyaltyBonuses = await context.loyaltyBonus.getByLoyaltyTierId(
          id
        );

        for (const loyaltyBonus of loyaltyBonuses) {
          if (
            loyaltyBonus.lowerBound <= amount &&
            (isNullOrUndefined(loyaltyBonus.upperBound) || amount <= loyaltyBonus.upperBound)
          ) {
            return {
              bonus:
                loyaltyBonus.type.toLocaleLowerCase() ===
                  loyaltyBonusTypes.PERCENT.toLocaleLowerCase()
                  ? (amount * loyaltyBonus.value) / 100
                  : loyaltyBonus.value,
            };
          }
        }
        return { bonus: 0 };
      } catch (err) {
        console.log('Error - getloyaltyTierBonus -> ', { err });
        return { bonus: 0 };
      }
    },
    getStoreOrderPaymentMethods(
      root,
      { getStoreOrderPaymentMethodsInput },
      context
    ) {
      return context.storeOrderSet.getAvailablePaymentMethods(
        getStoreOrderPaymentMethodsInput
      );
    },
    transactions(root, { filters, paging }, context) {
      return context.loyaltyTransaction.getTransactions({
        paging,
        filters,
        customerId: context.auth.id,
      });
    },
    getOrderPaymentMethods(root, { getOrderPaymentMethodsInput }, context) {
      return context.orderSet.getAvailablePaymentMethods(
        getOrderPaymentMethodsInput
      );
    },
    getCreditsPaymentMethods(root, { getCreditsPaymentMethodsInput }, context) {
      return context.loyaltyOrder.getAvailablePaymentMethods(
        getCreditsPaymentMethodsInput
      );
    },
    getGiftCardOrderPaymentMethods(
      root,
      { getGiftCardOrderPaymentMethodsInput },
      context
    ) {
      return context.giftCardOrder.getAvailablePaymentMethods(
        getGiftCardOrderPaymentMethodsInput
      );
    },
    groups(root, args, context) {
      return context.group.getAll();
    },
    group(root, args, context) {
      return context.group.getById(args.id);
    },
    groupByName(root, args, context) {
      return context.group.getByName(args.name);
    },
    roles(root, args, context) {
      return context.role.getAll();
    },
    role(root, args, context) {
      return context.role.getById(args.id);
    },
    roleByName(root, args, context) {
      return context.role.getByName(args.name);
    },
    permissions(root, args, context) {
      return context.permission.getAll();
    },
    permission(root, args, context) {
      return context.permission.getById(args.id);
    },
    permissionByName(root, args, context) {
      return context.permission.getByName(args.name);
    },
    customerCardToken(root, { id }, context) {
      return context.customerCardToken.getById(id);
    },
    async computeInvoice(root, { input }, context) {
      const inputWithCustomerId = assign(input, {
        customerId: input.customerId ? input.customerId : context.auth.id,
        srcPlatform: context.req.xAppOs || null,
        srcPlatformVersion: context.req.xAppVersion || null,
      });
      return context.orderSet.computeInvoice(inputWithCustomerId);
    },
    async getInvoice(root, { input }, context) {
      const inputWithCustomerId = assign(input, {
        customerId: input.customerId ? input.customerId : context.auth.id,
        srcPlatform: context.req.xAppOs || null,
        srcPlatformVersion: context.req.xAppVersion || null,
      });
      console.time('total');
      const result = await context.orderSet.getInvoice(inputWithCustomerId);
      console.timeEnd('total');
      return result;
    },
    async computeStoreOrderSetInvoice(root, { input }, context) {
      input.customerId = input.customerId ? input.customerId : context.auth.id;

      const validationResult = await context.storeOrderSet.validateOrder(input);

      if (validationResult.length > 0)
        return formatError(validationResult, input);

      return context.storeOrderSet.orderPricingCalculations(input);
    },
    async fetchStoreCheckoutData(root, { input }, context) {
      input.customerId = input.customerId ? input.customerId : context.auth.id;

      const validationResult = await context.storeOrderSet.validateOrder(input);

      if (validationResult.length > 0)
        return formatError(validationResult, input);

      const invoice = await context.storeOrderSet.orderPricingCalculations(
        input
      );
      const deliveryEstimateDateTime =
        invoice.shipping && invoice.shipping.deliveryEstimate
          ? moment().add(invoice.shipping.deliveryEstimate, 'hours')
          : null;

      return {
        invoice,
        deliveryEstimateDateTime,
      };
    },
    async getGiftCardsForApp(root, { countryIso }, context) {
      const giftCardCollections = await context.giftCardCollection.getForApp(
        countryIso
      );
      return giftCardCollections;
    },
    async giftCardCollections(root, { paging, filters }, context) {
      return context.giftCardCollection.getAllPaged(paging, filters);
    },
    async giftCardCollection(root, { id }, context) {
      return addLocalizationField(
        await context.giftCardCollection.getById(id),
        'name'
      );
    },
    async giftCardTemplates(root, { paging, filters }, context) {
      return context.giftCardTemplate.getAllPaged(paging, filters);
    },
    async giftCardTemplate(root, { id }, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.giftCardTemplate.getById(id),
          'name'
        ),
        'imageUrl'
      );
    },
    async giftCardOrders(root, { paging, filters }, context) {
      return context.giftCardOrder.getAllPaged(paging, filters);
    },
    storeOrderSetStatusTotal(root, { filters }, context) {
      const auth = context.auth;
      if (auth.authProvider === 'firebase') {
        // from admin-vendor user
        if (auth.isVendorAdmin) {
          return;
        } else {
          context.checkPermission('storeOrder:view', 'storeOrders');
        }
      } else {
        throw new Error('Permission Denied !!!'); // [attack_scope]
      }
      return context.storeOrderSet.storeOrderSetStatusTotal(filters);
    },
    storeOrderSets(root, { paging, filters }, context) {
      const auth = context.auth;
      if (auth.authProvider === 'authentication-service') {
        filters.customerId = context.auth.id;
      } else if (auth.authProvider === 'firebase') {
        // from admin-vendor user
        if (auth.isVendorAdmin) {
          return;
        } else {
          context.checkPermission('storeOrder:view', 'storeOrders');
        }
      } else {
        throw new Error('Permission Denied !!!'); // [attack_scope]
      }
      return context.storeOrderSet.getAllPaged(paging, filters);
    },
    async storeOrderSetsExporting(root, { filters }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        return context.storeOrderSet.getStoreOrderSetExporting(filters);
      } else throw new Error('Permission Denied !!!'); // [attack_scope]
    },
    async storeOrderSet(root, { id }, context) {
      const auth = context.auth;
      const storeOrder = await context.storeOrderSet.getById(id);
      if (auth.authProvider === 'authentication-service') {
        if (storeOrder.customerId !== auth.id) return; // [attack_scope]
      } else if (auth.authProvider === 'firebase') {
        // from admin-vendor user
        if (auth.isVendorAdmin) {
          return;
        } else {
          context.checkPermission('storeOrder:view', 'storeOrders');
        }
      } else {
        throw new Error('Permission Denied !!!'); // [attack_scope]
      }
      return storeOrder;
    },
    storeOrderSetForCallbacks(root, { id }, context) {
      return context.storeOrderSet.getById(id);
    },
    storeOrders(root, { paging, filters }, context) {
      if (context.auth.authProvider === 'authentication-service') {
        // from a customer
        filters.customerId = context.auth.id;
      } else if (context.auth.authProvider === 'firebase') {
        // from admin-vendor user
        if (context.auth.isVendorAdmin) {
          filters.brandIdList = context.auth.brandAdminInfo.brandAdminList;
        } else {
          // from general admin without portals
          context.checkPermission('storeOrder:view', 'storeOrders');
        }
      } else {
        throw new Error('Permission Denied !!!'); // [attack_scope]
      }

      return context.storeOrder.getAllPaidPaged(paging, filters);
    },
    async storeOrder(root, { id }, context) {
      let storeOrderResult = {};
      if (context.auth.authProvider === 'authentication-service') {
        // from a customer
        const [customer, storeOrder] = await Promise.all([context.customer.getById(context.auth.id), context.storeOrder.getById(id)]);
        const storeOrderSet = await context.storeOrderSet.getById(storeOrder.storeOrderSetId);
        if (!(customer && storeOrder && storeOrderSet.customerId === customer.id)) {
          throw new Error('Permission Denied !'); // [attack_scope]
        }
        storeOrderResult = storeOrder;
      } else if (context.auth.authProvider === 'firebase') {
        // from admin-vendor user
        const [admin, storeOrder] = await Promise.all([context.admin.getByAuthoId(context.auth.id), context.storeOrder.getById(id)]);
        if (admin && storeOrder) {
          if (context.auth.isVendorAdmin) {
            const brand = await context.brand.getById(storeOrder.brandId);
            if (brand && context.auth.isBrandAdmin(brand.id)) {
              storeOrderResult = storeOrder;
            } else {
              throw new Error('Permission Denied !!'); // [attack_scope]
            }
          } else {
            // from general admin without portals
            context.checkPermission('storeOrder:view', 'storeOrder');
            storeOrderResult = storeOrder;
          }
        } else {
          throw new Error('Permission Denied !!!'); // [attack_scope]
        }
      } else {
        throw new Error('Permission Denied !!!!'); // [attack_scope]
      }
      return storeOrderResult;
    },
    async storeOrderStatusTotal(root, { filters }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      let hasPermission = false;
      if (admin) {
        if (auth.isVendorAdmin) {
          if (filters.brandId && auth.isBrandAdmin(filters.brandId)) {
            hasPermission = true;
          }
        } else hasPermission = true;
      }
      if (!hasPermission) return; // [attack_scope]
      return context.storeOrder.storeOrderStatusTotal(filters);
    },
    async giftCardOrder(root, { id }, context) {
      const auth = context.auth;
      if (auth.authProvider === 'firebase') {
        context.checkPermission('giftCardsOrders:view', 'giftCardOrder');
        return context.giftCardOrder.getById(id);
      } else if (context.auth.authProvider === 'authentication-service') {
        const giftCardOrder = await context.giftCardOrder.getById(id);
        if (giftCardOrder && giftCardOrder.customerId === auth.id) {
          return giftCardOrder;
        }
      }
      throw new Error('Permission Denied !!!'); // [attack_scope]
    },
    giftCardOrderForCallbacks(root, { id }, context) {
      return context.giftCardOrder.getById(id);
    },
    async giftCards(root, { paging, filters }, context) {
      return context.giftCard.getAllPaged(paging, filters, context.auth.id);
    },
    async giftCardsForAdmin(root, { paging, filters }, context) {
      return context.giftCard.getAllPagedForAdmin(paging, filters);
    },
    async giftCard(root, { id }, context) {
      const auth = context.auth;
      let giftCard = null;
      if (auth.authProvider === 'firebase') {
        context.checkPermission('giftCards:view', 'giftCard');
        giftCard = await context.giftCard.getById(id);
      } else if (context.auth.authProvider === 'authentication-service') {
        giftCard = await context.giftCard.getById(id);
        if (!giftCard || giftCard.senderId !== auth.id || giftCard.receiverId !== auth.id) {
          throw new Error('Permission Denied !!!'); // [attack_scope]
        }
      } else {
        throw new Error('Permission Denied !!!'); // [attack_scope]
      }
      return addLocalizationField(
        addLocalizationField(giftCard, 'name'),
        'imageUrl'
      );
    },
    async giftCardBy(root, { code }, context) {
      if (code) return context.giftCard.getByShortCode(code);
      return null;
    },
    async customerExists(root, { phoneNumber }, context) {
      if (phoneNumber && (await context.customer.getByPhoneNumber(phoneNumber)))
        return true;
      return false;
    },
    referrals(root, { filters = { status: 'ALL' }, paging }, context) {
      return context.referral.referrals(filters, paging);
    },
    async customerWithReferral(root, { referralCode }, context) {
      const [customer] = await context.customer.getByReferralCode(referralCode);
      return customer;
    },
    async getCheckoutComConfig(root, { countryCode }, context) {
      const ckoConfig = await context.paymentService.getConfig(
        paymentProvider.CHECKOUT,
        countryCode
      );
      if (ckoConfig.error) {
        return formatError([ckoConfig.error], {
          query: 'getCheckoutComConfig',
          params: { countryCode },
        });
      }
      return ckoConfig;
    },
    getCheckoutComSavedCardTokens(root, params, context) {
      return context.paymentService.getCustomerSavedCardTokens({
        paymentProvider: paymentProvider.CHECKOUT,
        customerId: context.auth.id,
      });
    },
    async products(
      root,
      { filters = { status: 'ALL' }, paging },
      context
    ) {
      // this query returns public information
      return context.product.getAllPaged(paging, filters);
    },
    async product(root, { id }, context) {
      // this query returns public information
      return context.product.getById(id, true);
    },
    async productNew(root, { id }, context) {
      return context.product.getById(id, true);
    },
    async pickupLocations(root, { filters }, context) {
      // this query returns public information
      return context.pickupLocation.getAll(filters);
    },
    async pickupLocation(root, { id }, context) {
      return context.pickupLocation.getById(id);
    },
    async shippingPolicies(root, { filters }, context) {
      return context.shippingPolicy.getAll(filters);
    },
    async shippingPolicy(root, { id }, context) {
      return context.shippingPolicy.getById(id);
    },
    async storeHeaders(root, { filters }, context) {
      return addLocalizationField(
        await context.storeHeader.getAll(filters),
        'image'
      );
    },
    async storeHeader(root, { id }, context) {
      return context.storeHeader.getById(id, true);
    },
    async storeFeed(root, { countryCode }, context) {
      const feed = [];
      const storeHeaders = map(
        await context.storeHeader.getAllForMobile(countryCode),
        storeHeader => ({ ...storeHeader, __typeOf: 'StoreHeader' })
      );
      feed.push({
        layoutType: uILayoutType.CAROUSEL,
        items: storeHeaders,
      });
      const products = await context.product.getAll({ countryCode });
      const brandIds = uniq(map(products, row => row.brandId));
      if (brandIds.length > 0) {
        const brands = map(await context.brand.getById(brandIds), brand => ({
          ...addLocalizationField(
            addLocalizationField(brand, 'name'),
            'brandDescription'
          ),
          __typeOf: 'Brand',
        }));
        feed.push({
          header: {
            en: context.__('en', 'Stores'),
            ar: context.__('ar', 'Stores'),
          },
          layoutType: uILayoutType.CAROUSEL,
          items: brands,
        });
      }

      const categories = await context.category.getAll({
        status: statusTypes.ACTIVE,
      });
      if (categories.length > 0) {
        feed.push({
          header: {
            en: context.__('en', 'Categories'),
            ar: context.__('ar', 'Categories'),
          },
          layoutType: uILayoutType.CAROUSEL,
          items: map(categories, category => ({
            ...addLocalizationField(category, 'name'),
            __typeOf: 'Category',
          })),
        });
      }

      return feed;
    },
    async productsCatalog(root, { brandId }, context) {
      return context.productsCatalog.getCatalog(brandId);
    },
    signupPromos(root, { countryId, filters = { status: 'ALL' } }, context) {
      if (countryId) {
        return context.signupPromo.getByCountry(countryId, filters);
      }
      return context.signupPromo.getAll(filters);
    },
    signupPromo(root, args, context) {
      return context.signupPromo.getById(args.id);
    },
    signupPromoByCode(root, { code }, context) {
      return context.signupPromo.getByCode(code);
    },
    signupPromoByType(root, { type }, context) {
      return context.signupPromo.getByType(type);
    },
    async getNewAccessToken(_, { refreshToken }, context) {
      const { token } = await context.internalAuthService.refreshToken(
        refreshToken
      );
      return token;
    },
    customerGroup(root, { id }, context) {
      return context.customerGroup.getById(id);
    },
    customerGroups(root, { filters, paging }, context) {
      return context.customerGroup.getAll(filters, paging);
    },
    blogCategories(root, { status, paging }, context) {
      return context.blogCategory.getAll({ status, paging });
    },
    async blogCategory(root, { id }, context) {
      return context.blogCategory.getById(id);
    },
    blogPosts(root, { paging }, context) {
      return context.blogPost.getAll(paging);
    },
    async blogPost(root, { id }, context) {
      return context.blogPost.getById(id);
    },
    getCustomerFavoriteBrandLocation(root, { }, context) {
      const customerId = context.auth.id;
      return context.customerFavoriteBrandLocation.getByCustomerId(customerId);
    },
    async getNotificationCustomerForBrandLocationOpened(root, { brandLocationId }, context) {
      const customerId = context.auth.id;
      const { errors: validationResult, status, notifications } = await context.brandLocation.getNotificationForBrandLocation(
        customerId,
        brandLocationId
      );
      if (validationResult.length > 0)
        return formatError(validationResult, customerId);

      return { status, notifications };
    },
    getOrderRatingQuestionsByFilters(root, { filters }, context) {
      return context.orderRatingQuestion.getByFilters(filters);
    },
    getOrderRatingQuestionsByFullfilmentType(
      root,
      { fulfillmentType },
      context
    ) {
      return context.orderRatingQuestion.getByFulfillmentType({ fulfillmentType });
    },
    getOverallOrderRatingQuestion(root, args, context) {
      return context.orderRatingQuestion.getOverallQuestion();
    },
    newBrands(root, { countryId, countryIso, latitude, longitude }, context) {
      if (context.auth && context.auth.id) {
        return context.newBrands.getListByCountry({
          countryId,
          countryIso,
          customerId: context.auth.id,
          latitude,
          longitude,
        });
      }
      // If no customerId is present, just return normal list
      return context.newBrands.getListByCountry({
        countryId,
        countryIso,
        latitude,
        longitude,
      });
    },
    newBrandsLite(root, { countryIso, countryId }, context) {
      return context.newBrands.getLiteListByCountry({
        countryIso,
        countryId,
        customerId: context.auth && context.auth.id ? context.auth.id : null,
      });
    },
    allNewBrands(root, { countryId, countryIso }, context) {
      return context.newBrands.getListByCountryForAdminPortal({
        countryId,
        countryIso,
      });
    },
    getTotalSalesPercentageByPaymentMethod(root, { input }, context) {
      return context.vendorPortalDashboard.getTotalSalesPercentageByPaymentMethod(
        input
      );
    },
    getSummaryOfSalesWithTimePeriod(root, { input }, context) {
      return context.vendorPortalDashboard.getSummaryOfSalesWithTimePeriod(
        input
      );
    },
    getTotalOrderCountsByFulfillmentType(root, { input }, context) {
      return context.vendorPortalDashboard.getTotalOrderCountsByFulfillmentType(
        input
      );
    },
    getTotalSalesPercentageByFulfillmentType(root, { input }, context) {
      return context.vendorPortalDashboard.getTotalSalesPercentageByFulfillmentType(
        input
      );
    },
    getSummaryOfOrdersWithTimePeriod(root, { input }, context) {
      return context.vendorPortalDashboard.getSummaryOfOrdersWithTimePeriod(
        input
      );
    },
    getSummaryOfCustomersWithTimePeriod(root, { input }, context) {
      return context.vendorPortalDashboard.getSummaryOfCustomersWithTimePeriod(
        input
      );
    },
    getMostSellingProducts(root, { input }, context) {
      return context.vendorPortalDashboard.getMostSellingProducts(input);
    },
    getSummaryOfOrderItemsType(root, { input }, context) {
      return context.vendorPortalDashboard.getSummaryOfOrderItemsType(input);
    },
    getBranchesPerformances(root, { input }, context) {
      return context.vendorPortalDashboard.getBranchesPerformances(input);
    },
    // eslint-disable-next-line no-unused-vars
    async getDailyOrdersReports(root, { reportsInput }, context) {
      const targetCountry = await context.country.getById(
        reportsInput.countryId
      );
      if (!targetCountry) {
        return formatError(
          [dailyOrdersReportsError.COUNTRY_DOESNT_EXISTS],
          reportsInput
        );
      }
      const targetBucket = isProd
        ? 'cofe-reports'
        : 'cofe-reports-test';
      try {
        let month = reportsInput.month.toString();
        if (month.length === 1) month = '0' + month;
        let targetPath = `${targetCountry.isoCode.toUpperCase()}/${reportsInput.year.toString()}/${month}`;
        if (!isProd) {
          targetPath = `${env}/`.concat(targetPath);
        }
        targetPath = 'finance/daily-order-report/' + targetPath;
        const folderFileList = await getFolderFileList(
          targetBucket,
          targetPath
        );
        console.log('folderFileList : ', folderFileList);
        return { reports: folderFileList };
      } catch (err) {
        console.log('S3 Service Error : ', err);
        return formatError(
          [dailyOrdersReportsError.S3_SERVICE_ERROR],
          reportsInput
        );
      }
    },
    // eslint-disable-next-line no-unused-vars
    async getWeeklyReports(root, { reportsInput }, context) {
      const targetBucket = isProd
        ? 'cofe-reports'
        : 'cofe-reports-test';
      try {
        let month = reportsInput.month.toString();
        if (month.length === 1) month = '0' + month;
        let targetPath = `${reportsInput.year.toString()}/${month}`;
        if (!isProd) {
          targetPath = `${env}/`.concat(targetPath);
        }
        targetPath = 'finance/weekly-order-report/' + targetPath;
        const folderFileList = await getFolderFileList(
          targetBucket,
          targetPath
        );
        console.log('folderFileList : ', folderFileList);
        return { reports: folderFileList };
      } catch (err) {
        console.log('S3 Service Error : ', err);
        return formatError([weeklyReportsError.S3_SERVICE_ERROR], reportsInput);
      }
    },
    // eslint-disable-next-line no-unused-vars
    async getMonthlyReports(root, { reportsInput }, context) {
      const targetBucket = isProd
        ? 'cofe-reports'
        : 'cofe-reports-test';
      try {
        let month = reportsInput.month.toString();
        if (month.length === 1) month = '0' + month;
        let targetPath = `${reportsInput.year.toString()}/${month}`;
        if (!isProd) {
          targetPath = `${env}/`.concat(targetPath);
        }
        targetPath = 'finance/monthly-order-report/' + targetPath;
        const folderFileList = await getFolderFileList(
          targetBucket,
          targetPath
        );
        console.log('folderFileList : ', folderFileList);
        return { reports: folderFileList };
      } catch (err) {
        console.log('S3 Service Error : ', err);
        return formatError([monthlyReportsError.S3_SERVICE_ERROR], reportsInput);
      }
    },
    async getItemPriceChangeReports(root, { reportsInput }, context) {
      const targetCountry = await context.country.getById(
        reportsInput.countryId
      );
      if (!targetCountry) {
        return formatError(
          [careTeamReportsError.COUNTRY_DOESNT_EXISTS],
          reportsInput
        );
      }
      const targetBucket = isProd
        ? 'cofe-reports'
        : 'cofe-reports-test';
      try {

        let month = reportsInput.month.toString();
        if (month.length === 1) month = '0' + month;
        let targetPath = `${targetCountry.isoCode.toUpperCase()}/${reportsInput.year.toString()}/${month}`;
        if (!isProd) {
          targetPath = `${env}/`.concat(targetPath);
        }
        targetPath = 'care-team/item-price-change/' + targetPath;
        const folderFileList = await getFolderFileList(
          targetBucket,
          targetPath
        );
        console.log('folderFileList : ', folderFileList);
        return { reports: folderFileList };
      } catch (err) {
        console.log('S3 Service Error : ', err);
        return formatError([careTeamReportsError.S3_SERVICE_ERROR], reportsInput);
      }
    },
    async getItemStatusChangeReports(root, { reportsInput }, context) {
      const targetCountry = await context.country.getById(
        reportsInput.countryId
      );
      if (!targetCountry) {
        return formatError(
          [careTeamReportsError.COUNTRY_DOESNT_EXISTS],
          reportsInput
        );
      }
      const targetBucket = isProd
        ? 'cofe-reports'
        : 'cofe-reports-test';
      try {

        let month = reportsInput.month.toString();
        if (month.length === 1) month = '0' + month;
        let targetPath = `${targetCountry.isoCode.toUpperCase()}/${reportsInput.year.toString()}/${month}`;
        if (!isProd) {
          targetPath = `${env}/`.concat(targetPath);
        }
        targetPath = 'care-team/item-status-change/' + targetPath;
        const folderFileList = await getFolderFileList(
          targetBucket,
          targetPath
        );
        console.log('folderFileList : ', folderFileList);
        return { reports: folderFileList };
      } catch (err) {
        console.log('S3 Service Error : ', err);
        return formatError([careTeamReportsError.S3_SERVICE_ERROR], reportsInput);
      }
    },
    async getOperatingHoursChangeReports(root, { reportsInput }, context) {
      const targetCountry = await context.country.getById(
        reportsInput.countryId
      );
      if (!targetCountry) {
        return formatError(
          [careTeamReportsError.COUNTRY_DOESNT_EXISTS],
          reportsInput
        );
      }
      const targetBucket = isProd
        ? 'cofe-reports'
        : 'cofe-reports-test';
      try {

        let month = reportsInput.month.toString();
        if (month.length === 1) month = '0' + month;
        let targetPath = `${targetCountry.isoCode.toUpperCase()}/${reportsInput.year.toString()}/${month}`;
        if (!isProd) {
          targetPath = `${env}/`.concat(targetPath);
        }
        targetPath = 'care-team/operating-hours-change/' + targetPath;
        const folderFileList = await getFolderFileList(
          targetBucket,
          targetPath
        );
        console.log('folderFileList : ', folderFileList);
        return { reports: folderFileList };
      } catch (err) {
        console.log('S3 Service Error : ', err);
        return formatError([careTeamReportsError.S3_SERVICE_ERROR], reportsInput);
      }
    },
    async getBranchOfflineHourReports(root, { reportsInput }, context) {
      const targetCountry = await context.country.getById(
        reportsInput.countryId
      );
      if (!targetCountry) {
        return formatError(
          [careTeamReportsError.COUNTRY_DOESNT_EXISTS],
          reportsInput
        );
      }
      const targetBucket = isProd
        ? 'cofe-reports'
        : 'cofe-reports-test';
      try {

        let month = reportsInput.month.toString();
        if (month.length === 1) month = '0' + month;
        let targetPath = `${targetCountry.isoCode.toUpperCase()}/${reportsInput.year.toString()}/${month}`;
        if (!isProd) {
          targetPath = `${env}/`.concat(targetPath);
        }
        targetPath = 'care-team/branch-open-hours/' + targetPath;
        const folderFileList = await getFolderFileList(
          targetBucket,
          targetPath
        );
        console.log('folderFileList : ', folderFileList);
        return { reports: folderFileList };
      } catch (err) {
        console.log('S3 Service Error : ', err);
        return formatError([careTeamReportsError.S3_SERVICE_ERROR], reportsInput);
      }
    },
    /*brandSubscriptionModels(
      root,
      { paging, activeOnly, countryId, searchTerm, revenueModel, month, year, status = 'ALL' },
      context
    ) {
      return context.brandSubscriptionModel.brandSubscriptionModels({
        paging,
        activeOnly,
        countryId,
        searchTerm,
        revenueModel,
        month,
        year,
        status
      });
    },*/
    brandSubscriptionModel(root, { id }, context) {
      return context.brandSubscriptionModel.getById(id);
    },
    async storeFeedLite(root, args, context) {
      const categories = await context.category.getAll({
        status: statusTypes.ACTIVE,
      });
      let items = [];
      if (categories.length > 0) {
        items = map(categories, category => ({
          ...addLocalizationField(category, 'name'),
        }));
      }
      return items;
    },
    orderSetToBeTracked(root, args, context) {
      const customerId = context.auth.id;
      return context.orderSet.getOrderToBeTracked(customerId);
    },
    getRewardsTierDetails(root, args, context) {
      const customerId = context.auth.id;
      const brandId = args.brandId;
      return context.customerPerk.getRewardsTierDetails(customerId, brandId);
    },
    getBrandLocationsInBoundingBox(root, args, context) {
      return context.brandLocation.getBrandLocationsInBoundingBox(args);
    },
    getBrandLocationsAroundMe(root, args, context) {
      return context.brandLocation.getBrandLocationsAroundMe(args);
    },
    getWalkingAndDrivingInfo(root, args, context) {
      return context.brandLocation.getWalkingAndDrivingInfo(args);
    },
    getBrandLocationsAroundMePayload(root, args, context) {
      return context.brandLocation.getBrandLocationsAroundMePayload(args);
    },
    async brandsDiscoveryCreditEnabledByCountryId(
      root,
      { countryId, location },
      context
    ) {
      const customerId = context.auth.id;
      return context.brandLocation.brandsDiscoveryCreditEnabledByCountryId({
        location,
        countryId,
        customerId,
      });
    },
    async walletPage(root, { countryId }, context) {
      const customerId = context.auth.id;
      const walletAccount = await context.walletAccount.getWalletAccount({
        countryId,
        customerId,
      });
      let loyaltyTiers = await context.loyaltyTier.getAllByCountryWithLessFields(
        countryId
      );
      loyaltyTiers.forEach(loyaltyTier => {
        /*
        if (loyaltyTier.customAmount) {
          // Hardcoded values for now
          loyaltyTier.minAmount = '1.000';
          loyaltyTier.maxAmount = '9999.000';
        }
        */
        if (
          loyaltyTier.loyaltyBonuses &&
          loyaltyTier.loyaltyBonuses.length === 1
        ) {
          if (
            loyaltyTier.loyaltyBonuses[0].type.toLowerCase() ===
            loyaltyBonusTypes.PERCENT.toLowerCase()
          ) {
            loyaltyTier.percentage = loyaltyTier.loyaltyBonuses[0].value;
            loyaltyTier.bonus =
              (parseInt(loyaltyTier.amount, 10) *
                loyaltyTier.loyaltyBonuses[0].value) /
              100;
          } else {
            loyaltyTier.flatAmount = loyaltyTier.loyaltyBonuses[0].value;
            loyaltyTier.bonus = loyaltyTier.loyaltyBonuses[0].value;
          }
        }
      });
      loyaltyTiers = sortBy(loyaltyTiers, ['sortOrder']);
      return { loyaltyTiers, walletAccount };
    },
    async getGiftCardsForCustomer(root, args, context) {
      const customerId = context.auth.id;
      const sentGiftCards = addLocalizationField(
        addLocalizationField(
          await context.giftCard
            .getBy('sender_id', customerId)
            .orderBy('created', 'desc'),
          'imageUrl'
        ),
        'name'
      );
      const receivedGiftCards = addLocalizationField(
        addLocalizationField(
          await context.giftCard
            .getBy('receiver_id', customerId)
            .orderBy('redeemed_on', 'desc'),
          'imageUrl'
        ),
        'name'
      );
      return { sentGiftCards, receivedGiftCards };
    },
    async getAvailableFulfillmentListForBranch(
      root,
      { brandLocationId, location },
      context
    ) {
      return context.brandLocation.getAvailableFulfilments(brandLocationId, location);
    },
    async getAllFulfillmentListForBranch(
      root,
      { brandLocationId },
      context
    ) {
      return context.brandLocation.getAllFulfillments(brandLocationId);
    },
    async discoveryCreditInfoForCustomerWallet(
      root,
      { countryId, customerId },
      context
    ) {
      return context.brandLocation.brandsForDiscoveryCreditsByCustomerAndCountryId(
        {
          countryId,
          customerId,
        }
      );
    },

    async rewardsByBrandId(root, { brandId }, context) {
      // this query returns public information
      return context.reward.getActiveRewardByBrandId(brandId);
    },
    getCustomerRewardProgramDetailsNew(root, { rewardId }, context) {
      if (!context.auth.id) {
        return null;
      }
      return context.customer.getRewardProgramDetailsNew(
        context.auth.id,
        rewardId
      );
    },
    async countryCurrencyLookup(root, args, context) {
      const foundContent = await redis.getByKeyAndParse(
        countryCurrencyLookupKey
      );
      if (foundContent) {
        return foundContent;
      }
      const queriedResult = await context.country.getCountryCurrencyLookup();
      await redis.set(
        countryCurrencyLookupKey,
        JSON.stringify(queriedResult),
        'EX',
        redisTimeParameter.oneDayInSeconds
      );
      return queriedResult;
    },
    walletSettingsLite(root, args, context) {
      const customerId = context.auth.id;
      return context.walletAccount.getWalletSettingsAllCountries({
        customerId,
      });
    },
    async countryConfigs(root, args, context) {
      const cachedConfigs = await redis.getByKeyAndParse(countryConfigsKey);
      if (cachedConfigs) {
        return cachedConfigs;
      }
      const requestedConfigs = await context.countryConfiguration.getActiveCountryConfigurations();
      await redis.set(
        countryConfigsKey,
        JSON.stringify(requestedConfigs),
        'EX',
        redisTimeParameter.oneDayInSeconds
      );
      return requestedConfigs;
    },
    async getAddressFields(root, args, context) {
      return context.addressField.getAddressFields();
    },
    getAllPairedDevice(root, { countryId }, context) {
      return context.brandLocationDevice.getPairedDeviceList({ countryId });
    },
    async getGiftCardsForAppNew(root, { countryId }, context) {
      const giftCardCollections = await context.giftCardCollection.getForAppNew(
        countryId
      );
      return giftCardCollections;
    },
    async productsCatalogNew(root, { brandId }, context) {
      return context.productsCatalog.getCatalogNew(brandId);
    },
    async storeFeedNew(root, { countryId }, context) {
      const feed = [];
      if (countryId) {
        const storeHeaders = map(
          await context.storeHeader.getAllForMobileNew(countryId),
          storeHeader => ({ ...storeHeader, __typeOf: 'StoreHeader' })
        );
        feed.push({
          layoutType: uILayoutType.CAROUSEL,
          items: storeHeaders,
        });
        const products = await context.product.getAll({ countryId, status: 'ACTIVE' });
        const brandIds = uniq(map(products, row => row.brandId));
        if (brandIds.length > 0) {
          let brands = map(await context.brand.getById(brandIds), brand => {
            if (brand.status === 'ACTIVE') {
              return {
                ...addLocalizationField(
                  addLocalizationField(brand, 'name'),
                  'brandDescription'
                ),
                __typeOf: 'Brand',
              };
            } return null;
          });
          brands = brands.filter(n => n);
          feed.push({
            header: {
              en: context.__('en', 'Stores'),
              ar: context.__('ar', 'Stores'),
            },
            layoutType: uILayoutType.CAROUSEL,
            items: brands,
          });
        }

        const categories = await context.category.getAll({
          status: statusTypes.ACTIVE,
        });
        if (categories.length > 0) {
          feed.push({
            header: {
              en: context.__('en', 'Categories'),
              ar: context.__('ar', 'Categories'),
            },
            layoutType: uILayoutType.CAROUSEL,
            items: map(categories, category => ({
              ...addLocalizationField(category, 'name'),
              __typeOf: 'Category',
            })),
          });
        }
      }
      return feed;
    },
    async getReferralDeeplinkUrl(root, args, context) {
      try {
        const customer = await context.customer.getById(context.auth.id);
        const url = await getReferralUrl(customer.referralCode);
        return { url: url.shortLink };
      } catch (error) {
        await SlackWebHookManager.sendTextAndErrorToSlack('Generating Referral Deeplink URL process failed!.', error);
        return { url: null };
      }
    },
    async otpAvailableCountries(root, args, context) {
      return context.otpAvailableCountries.getAll();
    },
    async orderAgain(
      root,
      { orderSetId, brandLocationId },
      context
    ) {
      const { missingItemNames, orderSet, availabilityStatus } = await context.orderItem.orderItemsAvailability({ orderSetId, brandLocationId });
      return { missingItemNames, orderSet, availabilityStatus };
    },
    async getOrderRating(root, { id }, context) {
      return context.orderRating.getById(id);
    },
    getOrderRatingByOrderSetId(root, { orderSetId }, context) {
      return context.orderRating.getOrderRatingByOrderSetId(orderSetId);
    },
    getOrderRatingsByCustomerId(root, { customerId }, context) {
      return context.orderRating.getOrderRatingsByCustomerId(customerId);
    },
    getBrandLocationScore(root, { brandLocationId }, context) {
      return context.orderRating.getBranchScore(brandLocationId);
    },
    getBrandLocationScoreForCustomer(root, { brandLocationId }, context) {
      return context.orderRating.getFakeBranchScore(brandLocationId);
    },
    async getOrderRatings(root, { brandLocationId, filters, paging }, context) {
      return context.orderRating.getOrderRatings(
        brandLocationId,
        filters,
        paging
      );
    },
    async getOrderRatingsForCustomer(
      root,
      { brandLocationId, filters, paging },
      context
    ) {
      return context.orderRating.getOrderRatingsWithFakeBranchScore(
        brandLocationId,
        filters,
        paging
      );
    },
    async searchMenuItems(root, args, context) {
      return context.menuItem.searchWithCachedMenuData(args);
    },
    async subscriptionOrderForCallbacks(root, { id }, context) {
      const subscriptionOrder = await context.cSubscriptionOrder.getById(id);
      const subscription = await context.cSubscription.getById(subscriptionOrder.subscriptionId);
      return { subscriptionOrder, subscription };
    },
    async brandsPaged(
      root,
      { countryId, filters = { status: 'ALL'}, paging, catering },
      context
    ) {
      return context.brand.getAllPaged(countryId, filters, catering, paging);
    },
  },
  UILayoutItem: {
    __resolveType: obj => {
      return obj.__typeOf;
    },
  },
  UITarget: {
    __resolveType: obj => {
      return obj.__typeOf;
    },
  },
  CofeOrder: {
    __resolveType: obj => {
      return obj.__typeOf;
    },
  },
  MixedOrder: {
    __resolveType: obj => {
      return obj.__typeOf;
    },
  },
};
