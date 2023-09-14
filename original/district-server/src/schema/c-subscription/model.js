/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { cSubscriptionSaveError, cSubscriptionStatus, subscriptionTypeBadgeMaps } = require('./enum');
const { addPaging, addLocalizationField, objTransformToCamelCase, addLocalizationMultipleFields } = require('../../lib/util');
const { countryConfigurationKeys, orderCouponTypes } = require('../root/enums');
const { findIndex, map, orderBy, uniqBy, find, filter, mapKeys, isArray, first } = require('lodash');

class CSubscription extends BaseModel {
  constructor(db, context) {
    super(db, 'subscriptions', context);
  }

  async validateInputForNewSubscription(input) {
    const errors = [];
    if (input.compareAtPrice && (input.compareAtPrice == 'NaN' || parseFloat(input.compareAtPrice) < 0)) {
      errors.push(cSubscriptionSaveError.INVALID_COMPARE_AT_PRICE);
    }
    if (input.price && (input.price == 'NaN' || parseFloat(input.price) < 0)) {
      errors.push(cSubscriptionSaveError.INVALID_PRICE);
    }
    if (input.compareAtPrice && input.price && parseFloat(input.compareAtPrice) < parseFloat(input.price)) {
      errors.push(cSubscriptionSaveError.INVALID_COMPARE_AT_PRICE);
    }
    if (input.totalCupsCount && input.totalCupsCount < 0) {
      errors.push(cSubscriptionSaveError.INVALID_TOTAL_CUPS_COUNT);
    }
    if (input.perDayCupsCount && input.perDayCupsCount < 0) {
      errors.push(cSubscriptionSaveError.INVALID_PER_DAY_CUPS_COUNT);
    }
    if (input.perOrderMaxCupsCount && input.perOrderMaxCupsCount < 0) {
      errors.push(cSubscriptionSaveError.INVALID_PER_ORDER_MAX_CUPS_COUNT);
    }
    if (input.totalCupsCount && input.perDayCupsCount && input.totalCupsCount < input.perDayCupsCount) {
      errors.push(cSubscriptionSaveError.INVALID_PER_DAY_CUPS_COUNT);
    }
    if (input.totalCupsCount && input.perOrderMaxCupsCount && input.totalCupsCount < input.perOrderMaxCupsCount) {
      errors.push(cSubscriptionSaveError.INVALID_PER_ORDER_MAX_CUPS_COUNT);
    }
    if (input.perOrderMaxCupsCount && input.perDayCupsCount && input.perDayCupsCount < input.perOrderMaxCupsCount) {
      errors.push(cSubscriptionSaveError.INVALID_PER_ORDER_MAX_CUPS_COUNT);
    }
    if (input.period && input.period < 0) {
      errors.push(cSubscriptionSaveError.INVALID_PERIOD);
    }
    if (input.sortOrder && (input.sortOrder <= 0 || input.sortOrder > 3)) {
      errors.push(cSubscriptionSaveError.INVALID_SORT_ORDER);
    }
    if (input.id) {
      const subs = await this.getById(input.id);
      if (!subs) errors.push(cSubscriptionSaveError.INVALID_SUBSCRIPTION_ID);
    }
    if (!input.brandId || input.brandId.trim() == '') {
      errors.push(cSubscriptionSaveError.INVALID_BRAND);
    } else {
      const brand = await this.context.brand.getById(input.brandId);
      if (!brand) {
        errors.push(cSubscriptionSaveError.INVALID_BRAND);
      } else {
        const brandSubscriptions = await this.getSubscriptionByBrandId(input.brandId);
        if (input.status === cSubscriptionStatus.ACTIVE && brandSubscriptions.length >= 3) {
          errors.push(cSubscriptionSaveError.MAX_BRAND_SUBSCRIPTION);
        } else {
          const sortOrderAvailability = await this.isSortOrderAvailable(null, input.brandId, input.status, input.sortOrder);
          if (!sortOrderAvailability) {
            errors.push(cSubscriptionSaveError.INVALID_SORT_ORDER);
          }
          const country = await this.context.country.getById(brand.countryId);
          input.countryId = country.id;
          input.currencyId = country.currencyId;
        }
        if (input.mostPopular === true) {
          if (brandSubscriptions.some(t => t.mostPopular === true)) {
            errors.push(cSubscriptionSaveError.MOST_POPULAR_ALREADY_EXIST);
          }
        }
      }
    }

    if (!input.subscriptionType) {
      errors.push(cSubscriptionSaveError.INVALID_SUBSCRIPTION_TYPE);
    }
    return { input, errors };
  }

  async validateInputForOldSubscription(input) {
    const errors = [];
    const subs = await this.getById(input.id);
    if (!subs) {
      errors.push(cSubscriptionSaveError.INVALID_SUBSCRIPTION_ID);
      return { input, errors };
    }
    if (input.compareAtPrice && (input.compareAtPrice == 'NaN' || parseFloat(input.compareAtPrice) < 0)) {
      errors.push(cSubscriptionSaveError.INVALID_COMPARE_AT_PRICE);
    }
    if (input.price && (input.price == 'NaN' || parseFloat(input.price) < 0)) {
      errors.push(cSubscriptionSaveError.INVALID_PRICE);
    }
    if (input.compareAtPrice && input.price && parseFloat(input.compareAtPrice) < parseFloat(input.price)) {
      errors.push(cSubscriptionSaveError.INVALID_COMPARE_AT_PRICE);
    }
    if (input.totalCupsCount && input.totalCupsCount < 0) {
      errors.push(cSubscriptionSaveError.INVALID_TOTAL_CUPS_COUNT);
    }
    if (input.perDayCupsCount && input.perDayCupsCount < 0) {
      errors.push(cSubscriptionSaveError.INVALID_PER_DAY_CUPS_COUNT);
    }
    if (input.perOrderMaxCupsCount && input.perOrderMaxCupsCount < 0) {
      errors.push(cSubscriptionSaveError.INVALID_PER_ORDER_MAX_CUPS_COUNT);
    }
    if (input.totalCupsCount && input.perDayCupsCount && input.totalCupsCount < input.perDayCupsCount) {
      errors.push(cSubscriptionSaveError.INVALID_PER_DAY_CUPS_COUNT);
    }
    if (input.totalCupsCount && input.perOrderMaxCupsCount && input.totalCupsCount < input.perOrderMaxCupsCount) {
      errors.push(cSubscriptionSaveError.INVALID_PER_ORDER_MAX_CUPS_COUNT);
    }
    if (input.perOrderMaxCupsCount && input.perDayCupsCount && input.perDayCupsCount < input.perOrderMaxCupsCount) {
      errors.push(cSubscriptionSaveError.INVALID_PER_ORDER_MAX_CUPS_COUNT);
    }
    if (input.period && input.period < 0) {
      errors.push(cSubscriptionSaveError.INVALID_PERIOD);
    }
    if (input.sortOrder && (input.sortOrder <= 0 || input.sortOrder > 3)) {
      errors.push(cSubscriptionSaveError.INVALID_SORT_ORDER);
    }
    if (!input.brandId || input.brandId.trim() == '') {
      errors.push(cSubscriptionSaveError.INVALID_BRAND);
    } else {
      const brand = await this.context.brand.getById(input.brandId);
      if (!brand) {
        errors.push(cSubscriptionSaveError.INVALID_BRAND);
      } else if (subs.brandId !== input.brandId) {
        errors.push(cSubscriptionSaveError.SUBSCRIPTION_BRAND_CAN_NOT_UPDATED);
      } else {
        const brandSubscriptions = await this.getSubscriptionByBrandId(input.brandId);
        const isAlreadyActiveSub = findIndex(brandSubscriptions, brandSubscription => { return brandSubscription.id === input.id; }) > -1;
        if (input.status === cSubscriptionStatus.ACTIVE && !isAlreadyActiveSub && brandSubscriptions.length >= 3) {
          errors.push(cSubscriptionSaveError.MAX_BRAND_SUBSCRIPTION);
        } else {
          const sortOrderAvailability = await this.isSortOrderAvailable(input.id, input.brandId, input.status, input.sortOrder);
          if (!sortOrderAvailability) {
            errors.push(cSubscriptionSaveError.INVALID_SORT_ORDER);
          }
          const country = await this.context.country.getById(brand.countryId);
          input.countryId = country.id;
          input.currencyId = country.currencyId;
        }
      }
    }
    if (!input.subscriptionType) {
      errors.push(cSubscriptionSaveError.INVALID_SUBSCRIPTION_TYPE);
    }
    return { input, errors };
  }

  validateUUIDIsValid(input) {
    const uuidV4Format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (input.countryId && !input.countryId.match(uuidV4Format)) {
      throw new Error('Invalid country id');
    }
    if (input.currencyId && !input.currencyId.match(uuidV4Format)) {
      throw new Error('Invalid currency id');
    }
    if (input.brandId && !input.brandId.match(uuidV4Format)) {
      throw new Error('Invalid brand id');
    }
  }

  async getByName(name) {
    const query = await this.db(this.tableName)
      .where('name', name);
    return query;
  }

  async getById(subscriptionId) {
    const subs = await super.getById(subscriptionId);
    return addLocalizationField(addLocalizationField(addLocalizationField(
      addLocalizationField(
        addLocalizationField(
          subs,
          'name'
        ),
        'description'
      ),
      'imageUrl'
    ), 'iconUrl'), 'shortDescription');
  }

  async getQueryByFilters(filters, paging) {
    const customerId = this.context.auth.id;
    let isCustomer = false;
    let couponId = '';
    const subsAvailableForCountry = await this.isSubscriptionEnableByCountryId(filters.countryId);
    if (customerId) {
      const admin = await this.context.admin.getByAuthoId(customerId);
      if (!admin) {
        if (!subsAvailableForCountry) return [];
        filters.status = cSubscriptionStatus.ACTIVE;
        isCustomer = true;
      }
    } else {
      if (!subsAvailableForCountry) return [];
      filters.status = cSubscriptionStatus.ACTIVE;
    }
    let result = [];
    let query = this.db(this.tableName).select('subscriptions.*')
      .orderBy('sort_order', 'asc');
    if (filters) {
      if (filters?.couponId) {
        couponId = filters?.couponId;
        delete filters?.couponId;
      }
      if (couponId) {
        filters = mapKeys(filters, function (value, key) { return `subscriptions.${key}`; });
      }
      query = query.where(filters);
    }
    if (isCustomer) {
      const cSubsCustomers = await this.context.cSubscriptionCustomer.getAllActiveSubscriptions(customerId, filters.countryId);
      const unSortingResult = await query;
      cSubsCustomers.map(cSubsCustomer => {
        const subs = find(unSortingResult, elem => elem.id == cSubsCustomer.subscriptionId);
        if (subs) {
          subs.activePlan = true;
          result.push(subs);
        }
      });
      result = result.concat(unSortingResult);
      result = uniqBy(result, 'id');
    } else {
      if (couponId) {
        query.leftJoin('brands_coupons', 'subscriptions.brand_id', 'brands_coupons.brand_id')
          .leftJoin('coupons', 'brands_coupons.coupon_id', 'coupons.id')
          .where('coupons.order_type', orderCouponTypes.SUBSCRIPTION_ORDER)
          .andWhere('coupons.id', couponId);
      }
      if (paging) {
        query = addPaging(query, paging);
      }
      result = await query;
    }
    return addLocalizationMultipleFields(result, ['name', 'description', 'imageUrl', 'iconUrl', 'shortDescription']);
  }

  async getCurrency(subscriptionId) {
    const [currency] = await this.context.sqlCache(
      this.roDb
        .select('currencies.*')
        .from('currencies')
        .leftJoin(
          this.tableName,
          `${this.tableName}.currency_id`,
          'currencies.id'
        )
        .where(`${this.tableName}.id`, subscriptionId)
    );
    return currency;
  }

  async getSubscriptionByBrandId(brandId) {
    const query = this.db(this.tableName)
      .where('status', cSubscriptionStatus.ACTIVE);
    if (isArray(brandId)) {
      query.whereIn('brand_id', brandId);
    } else {
      query.where('brand_id', brandId);
    }
    return await query;
  }

  async isSubscriptionEnableByCountryId(countryId) {
    const subsAvailable = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.SUBSCRIPTION_ENABLE, countryId);
    if (subsAvailable) {
      return subsAvailable.configurationValue === 'true';
    }
    return false;
  }

  async subscriptionTypes(subscriptionTypeList, screen = 'general') {
    let badgeMaps = subscriptionTypeBadgeMaps.filter(t => t.screen === screen);
    if (subscriptionTypeList && subscriptionTypeList.length > 0) {
      const cleanList = [...new Set(subscriptionTypeList.map(item => item))];
      badgeMaps = badgeMaps.filter(t => cleanList.some(k => k === t.type));
    }
    const badgeList = badgeMaps.map(t => t.badge);
    const subscriptionTypesBadges = await this.context.badge.getBadgesByTypes(badgeList);
    if (subscriptionTypesBadges && subscriptionTypesBadges.length > 0) {
      const icons = (badgeType) => {
        return {
          iconPath: subscriptionTypesBadges?.find(t => t.type === badgeType)?.iconUrl,
          iconPathAr: subscriptionTypesBadges?.find(t => t.type === badgeType)?.iconUrlAr,
          iconPathTr: subscriptionTypesBadges?.find(t => t.type === badgeType)?.iconUrlTr,
        };
      };
      const subscriptionTypes = badgeMaps.map(t => {
        return {
          name: t.type,
          screen,
          ...icons(t.badge),
        };
      });
      return subscriptionTypes;
    } else {
      return null;
    }
  }

  async subscriptionType(subscriptionType) {
    const res = await this.subscriptionTypes([subscriptionType]);
    return first(res);
  }

  async getCSubscriptionBrands(
    {
      countryId,
      location,
      searchText = '',
      searchTextLanguage = 'EN',
      paging
    }
  ) {
    const query = this.context
      .roDb({ s: this.tableName })
      .select({
        brand: this.roDb.raw('jsonb_agg(b.*) -> 0'),
        activePlanIds: this.roDb.raw('jsonb_agg(distinct s.id)'),
        distances: this.roDb.raw(`
          jsonb_agg(ROUND(
            (ST_DistanceSphere(
              bla.geolocation,
              ST_Makepoint(:longitude, :latitude)
            ))::numeric
          ))
        `, location),
        branches: this.roDb.raw(`json_agg(json_build_object('branchId', bl.id,
        'distance',
        ROUND((ST_DistanceSphere(bla.geolocation,ST_Makepoint(:longitude, :latitude)))::numeric)))`, location),
      })
      .leftJoin(
        { b: this.context.brand.tableName },
        'b.id',
        's.brand_id'
      )
      .leftJoin(
        { bl: this.context.brandLocation.tableName },
        'b.id',
        'bl.brand_id'
      )
      .leftJoin(
        { bla: this.context.brandLocationAddress.tableName },
        'bl.id',
        'bla.brand_location_id'
      )
      .where('s.country_id', countryId)
      .where('s.status', cSubscriptionStatus.ACTIVE)
      .where('b.status', 'ACTIVE')
      .where('bl.status', 'ACTIVE')
      .groupBy('s.brand_id');
    switch (searchTextLanguage) {
      case 'EN':
        query.where(
          'b.name',
          'ilike',
          `%${searchText}%`
        );
        break;
      case 'AR':
        query.where(
          'b.name_ar',
          'ilike',
          `%${searchText}%`
        );
        break;
    }
    let resp = null;
    let brandsWithActivePlanCount = await query;
    if (paging) {
      // CCS-1700 - BYPASSED for MOBILE
      paging.perPage = brandsWithActivePlanCount.length;
      resp = this.addRefreshPaging(brandsWithActivePlanCount, paging.page, paging.perPage);
      brandsWithActivePlanCount = resp.results;
    }

    let brandList = [];
    for (const item of brandsWithActivePlanCount) {
      item.branches = uniqBy(item.branches, 'branchId');
      item.branches = orderBy(item.branches, ['distance'], ['asc']);
      const subscribableItems = await this.db('subscription_menu_items')
        .whereIn('subscription_id', item.activePlanIds);
      let nearestBranchDistance = null;
      let branchFound = false;
      if (subscribableItems && subscribableItems.length > 0) {
        for (const branch of item.branches) {
          if (branchFound) {
            break;
          }
          for (const menuItem of subscribableItems) {
            const isItemAvailable = await this.context.menuItem.getAvailability(menuItem.menuItemId, branch.branchId);
            if (isItemAvailable) {
              nearestBranchDistance = branch.distance;
              branchFound = true;
              break;
            }
          }
        }
      }
      brandList.push({
        brand: addLocalizationMultipleFields(objTransformToCamelCase(item.brand), ['name', 'brandDescription']),
        activePlanCount: item.activePlanIds.length,
        nearestBranchDistance,
      });
    }

    /*let brandList = brandsWithActivePlanCount.map(item => {
      return {
        brand: addLocalizationField(objTransformToCamelCase(item.brand), 'name'),
        activePlanCount: item.activePlanIds.length,
        nearestBranchDistance: Math.min(...item.distances),,
      };
    });*/
    brandList = orderBy(brandList, ['nearestBranchDistance'], ['asc']);
    if (resp && resp.paging) {
      return { brandList, paging: resp.paging };
    } else {
      return { brandList, paging: null };
    }
  }

  async getSubscriptionByBrandIdAndStatus(brandId, status) {
    return this.db(this.tableName)
      .where('brand_id', brandId)
      .where('status', status);
  }


  async isSortOrderAvailable(subscriptionId, brandId, status, sortOrder) {
    let allSubscriptions = await this.getSubscriptionByBrandIdAndStatus(brandId, status);
    if (subscriptionId) {
      allSubscriptions = filter(allSubscriptions, s => s.id != subscriptionId);
    }
    const sortOrders = map(allSubscriptions, s => s.sortOrder);
    if (!sortOrders.includes(sortOrder)) {
      return true;
    }
    return false;
  }

  async getAvailableSortOrders(brandId) {
    const [activeList, inactiveList, deletedList] = await Promise.all([
      this.getSubscriptionByBrandIdAndStatus(brandId, cSubscriptionStatus.ACTIVE),
      this.getSubscriptionByBrandIdAndStatus(brandId, cSubscriptionStatus.INACTIVE),
      this.getSubscriptionByBrandIdAndStatus(brandId, cSubscriptionStatus.DELETED)]);
    const lst = [1, 2, 3];
    const activeSortOrders = map(activeList, s => s.sortOrder);
    const inactiveSortOrders = map(inactiveList, s => s.sortOrder);
    const deletedSortOrders = map(deletedList, s => s.sortOrder);
    const availableActiveSortOrders = filter(lst, l => !activeSortOrders.includes(l));
    const availableInactiveSortOrders = filter(lst, l => !inactiveSortOrders.includes(l));
    const availableDeletedSortOrders = filter(lst, l => !deletedSortOrders.includes(l));
    const isActiveSubscribable = availableActiveSortOrders && availableActiveSortOrders.length != 0 ? true : false;
    const isInactiveSubscribable = availableInactiveSortOrders && availableInactiveSortOrders.length != 0 ? true : false;
    const isDeletedSubscribable = availableDeletedSortOrders && availableDeletedSortOrders.length != 0 ? true : false;
    return { availableActiveSortOrders, availableInactiveSortOrders, availableDeletedSortOrders, isActiveSubscribable, isInactiveSubscribable, isDeletedSubscribable };
  }
}


module.exports = CSubscription;
