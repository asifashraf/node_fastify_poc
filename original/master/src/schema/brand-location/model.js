/* eslint-disable max-params */
const moment = require('moment');
const {
  omit,
  extend,
  forEach,
  some,
  orderBy,
  map,
  filter,
  clone,
  first,
  get,
  camelCase,
  find,
} = require('lodash');
// const cryptoRandomString = require('crypto-random-string');
const Promise = require('bluebird');
const BaseModel = require('../../base-model');
const { csvToJSON } = require('../../lib/aws-s3');
const {
  addPaging,
  transformToCamelCase,
  now,
  removeLocalizationField,
  addLocalizationField,
  isNullOrUndefined,
  addLocalizationMultipleFields,
  uuid,
} = require('../../lib/util');
const { computeOpenTimeRanges } = require('../../lib/schedules');
const KD = require('../../lib/currency');
const { isTest, timezone } = require('../../../config');
const {
  brandLocationError,
  brandLocationStatus,
  brandLocationPriceRuleType,
  brandLocationPriceRuleAction,
  setBrandLocationAcceptingOrdersError,
  countryConfigurationKeys,
  importBranchContactsPayloadError,
  fulfillmentType,
  brandStatus,
  customerNotificationForBrandLocationOpenError,
} = require('../root/enums');
const { orderFulfillmentTypes } = require('../order-set/enums');
const { createLoaders } = require('./loaders');
const { brandLocationMenuKey, brandLocationMenuWithPatternKey } = require('../../../redis/keys');
const {
  getCachedStoreStatusByFulfillmentType,
  getCachedStoreStatusByMultipleKeys,
  calculateBrandLocationStoreAvailabilityKey,
  calculateStoreStatusFulfillmentKey,
  saveCachedOpenings, 
  saveBrandLocationStoreAvailability, 
  invalidateBrandLocationStoreAvailability,
  calculateOpeningsKey,
  saveCachedLocationsInRadius,
  getCachedLocationsInRadius,
  calculateInRadiusKey,
  getCachedBranchesForHomePage,
  saveCachedBranchesForHomePage,
  calculateBranchesForHomePage,
  calculateBrandMenuKey,
  getCachedBrandMenu,
} = require('./redis-helper');
const { invalidateMenuForBrandLocation } = require('../c-menu/utils');
const BrandLocationReportFormatter = require('./brand-location-report-formatter');
const {
  brandLocationStoreStatus,
  brandLocationStoreStatusFull,
  newFulfillmentTypes,
  fulfillmentTypesWithKey,
  weekDaysTranslate,
} = require('./enums');
const { orderTypes } = require('../root/enums');
const { priceSlash, branchAvailability } = require('../../../config');
const { tagRelationType } = require('../tag-relation/enums');
const { notificationCategories } = require('../../lib/notifications');
const { contentTemplates, replacePlaceholders } = require('../../lib/push-notification');
const Money = require('../../lib/currency');
const { menuItemStatus } = require('../menu-item/enums');

class BrandLocation extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_locations', context);
    this.viewName = 'view_brand_locations';
    this.viewBranchBrand = 'view_branch_brand';
    this.loaders = createLoaders(this);
  }

  filterBrandLocations(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = brandLocationStatus.ACTIVE;
    }
    if (filters.status !== 'ALL') {
      query.where('brand_locations.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '( LOWER(brand_locations.name) like ? or brand_locations.name_ar like ? or brand_locations.name_tr like ? ) '
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    if (filters.brandId) {
      query.where('brand_locations.brand_id', filters.brandId);
    }
    if (filters.tagId) {
      query.whereIn('id', this.context.tagRelation.getByRelTypeAndTagId(tagRelationType.BRAND_LOCATION, filters.tagId).select('rel_id'));
    }
    return query;
  }

  getById(id) {
    if (!id) return id;
    if (!uuid.validate(id)) return null;
    return this.loaders.byId.load(id);
  }

  async getWithBrandById(id) {
    const brandLocation = addLocalizationMultipleFields(await this.getById(id), ['name']);
    const brandId = brandLocation.brandId;
    const brand = addLocalizationMultipleFields(await this.context.brand.getById(brandId), ['name', 'brandDescription']);
    brandLocation.brand = brand;
    return brandLocation;
  }

  getBrandLocations(baseQuery, filters) {
    let query = baseQuery || super.getAll();
    query = query
      .select(
        this.roDb.raw(`
      brand_locations.*,
      brand_location_addresses.id as brand_location_address_id,
      brand_location_addresses.short_address,
      brand_location_addresses.short_address_ar,
      brand_location_addresses.short_address_tr,
      brand_location_addresses.neighborhood_id,
      brand_location_addresses.street,
      brand_location_addresses.city,
      brand_location_addresses.city_id,
      ST_X(brand_location_addresses.geolocation) as longitude,
      ST_Y(brand_location_addresses.geolocation) as latitude`)
      )
      .join(
        'brand_location_addresses',
        'brand_location_addresses.brand_location_id',
        'brand_locations.id'
      )
      .join('brands', 'brands.id', 'brand_locations.brand_id')
      .orderBy('brands.name');

    query = this.filterBrandLocations(query, filters);

    return query;
  }

  getAll(countryId, filters) {
    if (countryId) {
      return this.getByCountryId(countryId, filters);
    }
    return this.getBrandLocations(null, filters);
  }

  getByCountryId(countryId, filters) {
    return this.getBrandLocations(null, filters).where(
      'brands.country_id',
      countryId
    );
  }

  getByBrand(brandId, geolocation, filters) {
    // status = (status || brandLocationStatus.ACTIVE).trim();
    if (geolocation) {
      const { longitude, latitude } = geolocation;
      let query = this.db.table('brand_locations');
      query = query.select(
        this.db.raw(
          `DISTINCT ON (brand_id) brand_locations.*,
          brand_location_addresses.id as brand_location_address_id,
          brand_location_addresses.short_address,
          brand_location_addresses.short_address_ar,
          brand_location_addresses.short_address_tr,
          brand_location_addresses.neighborhood_id,
          brand_location_addresses.street,
          brand_location_addresses.city,
          brand_location_addresses.city_id,
          ST_X(brand_location_addresses.geolocation) as longitude,
          ST_Y(brand_location_addresses.geolocation) as latitude,
          ROUND((ST_Distance(ST_Transform(brand_location_addresses.geolocation,7094), ST_Transform(ST_SetSRID(ST_Makepoint(${longitude},${latitude}),4326),7094)) / 1000)::numeric,2) as distance`
        )
      );
      // DISTINCT ON requires that this order clause comes first.
      query = query.orderBy('brand_locations.brand_id');
      query = query
        .join(
          'brand_location_addresses',
          'brand_location_addresses.brand_location_id',
          'brand_locations.id'
        )
        .orderBy(
          this.db.raw(
            // See: https://boundlessgeo.com/2011/09/indexed-nearest-neighbour-search-in-postgis/
            `brand_location_addresses.geolocation <-> st_setsrid(st_makepoint(${longitude},${latitude}),4326)`
          )
        );

      query = this.filterBrandLocations(query, filters);
      return query.then(transformToCamelCase);
    }
    // If No geolocation, just return all by brand Id
    const q = this.getAll(null, filters).where('brand_id', brandId);
    // q = this.filterBrandLocations(query, filters);
    return q;
  }

  // When allowing a brand location to set another brand location for delivery
  // we need to make sure that only brand locations which support delivery are
  // returned as an option
  getDeliveryFulfillmentLocations(filters) {
    let query = this.db(this.tableName)
      .where('has_delivery', true)
      .andWhere('delivery_location_id', null)
      .select(
        this.db.raw(`
        brand_locations.*,
        brand_location_addresses.id as brand_location_address_id,
        brand_location_addresses.short_address,
        brand_location_addresses.short_address_ar,
        brand_location_addresses.short_address_tr,
        brand_location_addresses.neighborhood_id,
        brand_location_addresses.street,
        brand_location_addresses.city,
        brand_location_addresses.city_id,
        ST_X(brand_location_addresses.geolocation) as longitude,
        ST_Y(brand_location_addresses.geolocation) as latitude`)
      )
      .join(
        'brand_location_addresses',
        'brand_location_addresses.brand_location_id',
        'brand_locations.id'
      );
    query = this.filterBrandLocations(query, filters);
    return query;
  }

  async openings(id, timeZoneIdentifier, timespanStart, numberOfDaysToScan) {
    const context = this.context;
    const currentTime = timespanStart
      ? moment(timespanStart)
      : moment(now.get());
    // moment('2017-12-04T08:00:00+00:00');
    const getWeeklySchedules = context.weeklySchedule.getByBrandLocation(id);
    // const getDeliverySchedules = context.weeklySchedule.getByBrandLocation(id);
    const getScheduleExceptions = context.scheduleException.getByBrandLocationIntersectingTimeRange(
      id,
      currentTime,
      currentTime.clone().add(numberOfDaysToScan, 'days')
    );

    const [
      weeklySchedules,
      scheduleExceptions,
      // deliverySchedules,
    ] = await Promise.all([
      getWeeklySchedules,
      getScheduleExceptions,
      // getDeliverySchedules,
    ]);
    let weeklySchedulesFiltered = weeklySchedules;
    let deliverySchedulesFiltered = map(weeklySchedules, ws => clone(ws));
    let expressDeliverySchedulesFiltered = map(weeklySchedules, ws =>
      clone(ws)
    );

    deliverySchedulesFiltered.forEach((day, i) => {
      if (!deliverySchedulesFiltered[i].openAllDay) {
        deliverySchedulesFiltered[i].openTime =
          deliverySchedulesFiltered[i].deliveryOpenTime;
        deliverySchedulesFiltered[i].openDuration =
          deliverySchedulesFiltered[i].deliveryOpenDuration;
      }
    });

    expressDeliverySchedulesFiltered.forEach((day, i) => {
      if (!expressDeliverySchedulesFiltered[i].openAllDay) {
        expressDeliverySchedulesFiltered[i].openTime =
          expressDeliverySchedulesFiltered[i].expressDeliveryOpenTime;
        expressDeliverySchedulesFiltered[i].openDuration =
          expressDeliverySchedulesFiltered[i].expressDeliveryOpenDuration;
      }
    });

    // remove extra properties
    weeklySchedulesFiltered = map(weeklySchedulesFiltered, w => {
      delete w.deliveryOpenTime;
      delete w.deliveryOpenDuration;
      delete w.expressDeliveryOpenTime;
      delete w.expressDeliveryOpenDuration;
      return w;
    });
    deliverySchedulesFiltered = map(deliverySchedulesFiltered, w => {
      delete w.deliveryOpenTime;
      delete w.deliveryOpenDuration;
      delete w.expressDeliveryOpenTime;
      delete w.expressDeliveryOpenDuration;
      return w;
    });
    expressDeliverySchedulesFiltered = map(
      expressDeliverySchedulesFiltered,
      w => {
        delete w.deliveryOpenTime;
        delete w.deliveryOpenDuration;
        delete w.expressDeliveryOpenTime;
        delete w.expressDeliveryOpenDuration;
        return w;
      }
    );
    // console.log('scheduleExceptions', scheduleExceptions);
    const computedOpenings = computeOpenTimeRanges(
      currentTime,
      numberOfDaysToScan,
      timeZoneIdentifier,
      weeklySchedulesFiltered,
      scheduleExceptions,
      deliverySchedulesFiltered,
      expressDeliverySchedulesFiltered
    );
    const cacheKey = calculateOpeningsKey(id, {
      timespanStart,
      numberOfDaysToScan,
    });
    await saveCachedOpenings(cacheKey, computedOpenings);
    return computedOpenings;
  }

  async locationsForHomeScreen(
    neighborhoodId,
    hasDelivery,
    geolocation,
    paging,
    filters
  ) {
    // Use the provided geolocation, otherwise look up defaults from the db config
    const { longitude, latitude } =
      geolocation ||
      (await this.db('configuration')
        .select(
          'default_latitude as latitude',
          'default_longitude as longitude'
        )
        .first());

    let query = this.db('brand_locations');

    const select = `brand_locations.*,
      is_primary,
      brand_location_addresses.id as brand_location_address_id,
      brand_location_addresses.short_address,
      brand_location_addresses.short_address_ar,
      brand_location_addresses.short_address_tr,
      brand_location_addresses.neighborhood_id,
      brand_location_addresses.street,
      brand_location_addresses.city,
          brand_location_addresses.city_id,
      ST_X(brand_location_addresses.geolocation) as longitude,
      ST_Y(brand_location_addresses.geolocation) as latitude,
      distance
      `;

    query = query
      .select(this.db.raw(select))
      .with('with_row_number', qb1 => {
        // This sub query ranks each location per brand by distance
        qb1
          .with('with_distance', qb2 => {
            // Inner most sub query gets locations with their distances
            qb2
              .select(
                // We set is_primary to 0 when a location is the primary location so that we can sort ASC
                // along with distance below
                this.db.raw(
                  `brand_locations.brand_id,
                  brand_locations.id,
                  (SELECT CASE WHEN brands.primary_location_id = brand_locations.id THEN 0 ELSE 1 END) as is_primary,
                  ROUND((ST_Distance(ST_Transform(brand_location_addresses.geolocation,7094),
        ST_Transform(ST_SetSRID(ST_Makepoint(?, ?),4326),7094)))::numeric,2) distance`,
                  [longitude, latitude]
                )
              )
              .from('brand_locations')
              .join(
                'brand_location_addresses',
                'brand_location_addresses.brand_location_id',
                'brand_locations.id'
              )
              .join('brands', 'brands.id', 'brand_locations.brand_id')
              .where('accepting_orders', true);

            if (hasDelivery) {
              qb2.where({
                has_delivery: true, // eslint-disable-line camelcase
                delivery_location_id: null, // eslint-disable-line camelcase
              });
            }

            if (neighborhoodId) {
              qb2
                .join(
                  'brand_locations_neighborhoods',
                  'brand_locations_neighborhoods.brand_location_id',
                  'brand_locations.id'
                )
                .where(
                  'brand_locations_neighborhoods.neighborhood_id',
                  neighborhoodId
                );
            }
          })
          .select(
            this.db.raw(`
            *,
            ROW_NUMBER() OVER (PARTITION BY brand_id ORDER BY is_primary, distance asc) AS row_num
          `)
          )
          .from('with_distance');
      })
      // Finally we take this list and join for the rest of the columns we need
      .join('brands', 'brands.id', 'brand_locations.brand_id')
      .join(
        'brand_location_addresses',
        'brand_location_addresses.brand_location_id',
        'brand_locations.id'
      )
      .join('with_row_number', 'brand_locations.id', 'with_row_number.id')
      .where('row_num', 1);

    query = query.orderBy('distance', 'asc');

    query = this.filterBrandLocations(query, filters);

    const locations = await addPaging(query, paging);

    // After loading one location per brand, sort them by whether or not they are open
    const currentTime = moment(now.get());

    await Promise.map(locations, async location => {
      const openings = await this.openings(
        location.id,
        timezone,
        currentTime,
        1
      );
      location.isOpen = some(openings.pickup, opening =>
        currentTime.isBetween(opening.begin, opening.end)
      );
    });

    return orderBy(locations, ['isOpen'], ['desc']);
  }

  async locationsInRadius({
    location,
    radius,
    brandIds,
    filters,
    paging,
    countryIso,
    // omitting radius in locationsInRadius query is not best way
    // we must create new query for that and separate them ASAP
    omitRadius,
  }) {
    // status = (status || brandLocationStatus.ACTIVE).trim();
    filters = filters || { status: brandLocationStatus.ACTIVE };
    radius = radius ? radius : 7000;
    // Basically creates a geohash from location and md5 hash of other params
    const targetCacheKey = calculateInRadiusKey(location, {
      radius,
      brandIds,
      filters,
      paging,
      countryIso,
      omitRadius,
    });
    // Checks for existing response
    const cachedResponse = await getCachedLocationsInRadius(targetCacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    let country;
    if (countryIso) {
      country = await this.context.country.getByCode(countryIso);
    }
    if (country && filters.fulfillmentType) {
      switch (filters.fulfillmentType) {
        case orderFulfillmentTypes.PICKUP: {
          const {
            configurationValue,
          } = (await this.context.countryConfiguration.getByKey(
            countryConfigurationKeys.PICKUP_RADIUS,
            country.id
          )) || { configurationValue: 1000 };
          radius = configurationValue;
          break;
        }
        case orderFulfillmentTypes.CAR: {
          const {
            configurationValue,
          } = (await this.context.countryConfiguration.getByKey(
            countryConfigurationKeys.CAR_WINDOW_RADIUS,
            country.id
          )) || { configurationValue: 15000 };
          radius = configurationValue;
          break;
        }
        default:
          radius = 1000;
          break;
      }
    }
    const { longitude, latitude } = location;
    let query = this.roDb('brand_locations');

    const select = `brand_locations.*,
      is_primary,
      brand_location_addresses.id as brand_location_address_id,
      brand_location_addresses.short_address,
      brand_location_addresses.short_address_ar,
      brand_location_addresses.short_address_tr,
      brand_location_addresses.neighborhood_id,
      brand_location_addresses.street,
      brand_location_addresses.city,
          brand_location_addresses.city_id,
      ST_X(brand_location_addresses.geolocation) as longitude,
      ST_Y(brand_location_addresses.geolocation) as latitude,
      distance
      `;

    query = query
      .select(this.roDb.raw(select))
      .with('with_row_number', qb1 => {
        // This sub query ranks each location per brand by distance
        qb1
          .with('with_distance', qb2 => {
            // Inner most sub query gets locations with their distances
            qb2
              .select(
                // We set is_primary to 0 when a location is the primary location so that we can sort ASC
                // along with distance below
                this.roDb.raw(
                  `brand_locations.brand_id,
                  brand_locations.id,
                  (SELECT CASE WHEN brands.primary_location_id = brand_locations.id THEN 0 ELSE 1 END) as is_primary,
                  ROUND((ST_Distance(ST_Transform(brand_location_addresses.geolocation,7094),
        ST_Transform(ST_SetSRID(ST_Makepoint(?, ?),4326),7094)))::numeric,2) distance`,
                  [longitude, latitude]
                )
              )
              .from('brand_locations')
              .join(
                'brand_location_addresses',
                'brand_location_addresses.brand_location_id',
                'brand_locations.id'
              )
              .join('brands', 'brands.id', 'brand_locations.brand_id')
              .where('accepting_orders', true);
            if (filters.fulfillmentType === orderFulfillmentTypes.DELIVERY) {
              if (!omitRadius) {
                qb2.andWhereRaw(
                  `ST_DWithin(
                  ST_Transform(brand_location_addresses.geolocation, 7094),
                  ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 7094),
                  brand_locations.delivery_radius*1000
                )`,
                  [longitude, latitude]
                );
              }
              qb2.andWhere('brand_locations.has_delivery', true);
            } else if (
              filters.fulfillmentType === orderFulfillmentTypes.EXPRESS_DELIVERY
            ) {
              if (!omitRadius) {
                qb2.andWhereRaw(
                  `ST_DWithin(
                  ST_Transform(brand_location_addresses.geolocation, 7094),
                  ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 7094),
                  brand_locations.express_delivery_radius*1000
                )`,
                  [longitude, latitude]
                );
              }
              qb2.andWhere('brand_locations.allow_express_delivery', true);
            } else {
              if (!omitRadius) {
                qb2.andWhereRaw(
                  `ST_DWithin(
                    ST_Transform(brand_location_addresses.geolocation, 7094),
                    ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 7094),
                    ?
                  )`,
                  [longitude, latitude, radius]
                );
              }
              if (filters.fulfillmentType === orderFulfillmentTypes.CAR) {
                qb2.andWhere('brand_locations.allow_deliver_to_car', true);
              }
            }
            if (brandIds) {
              qb2.whereIn('brand_locations.brand_id', brandIds);
            }
          })
          .select(
            this.roDb.raw(`
            *,
            ROW_NUMBER() OVER (PARTITION BY brand_id ORDER BY is_primary, distance asc) AS row_num
          `)
          )
          .from('with_distance');
      })
      // Finally we take this list and join for the rest of the columns we need
      .join('brands', 'brands.id', 'brand_locations.brand_id')
      .join(
        'brand_location_addresses',
        'brand_location_addresses.brand_location_id',
        'brand_locations.id'
      )
      .join('with_row_number', 'brand_locations.id', 'with_row_number.id');

    if (country) {
      query.andWhere('brands.country_id', country.id);
    }

    query = query.orderBy('distance', 'asc');

    query = this.filterBrandLocations(query, filters);

    let locations = await addPaging(query, paging);
    if (filters.distinctByBrand) {
      locations = locations.reduce((prev, curr) => {
        const index = prev.findIndex(({ brandId }) => brandId === curr.brandId);
        if (index === -1) {
          return [...prev, { ...curr, nearbyBrandLocationCount: 1 }];
        }
        prev[index].nearbyBrandLocationCount += 1;
        return prev;
      }, []);
    }
    // After loading locations, sort them by whether or not they are open
    const currentTime = moment(now.get());

    await Promise.map(locations, async location => {
      const openings = await this.openings(
        location.id,
        timezone,
        currentTime,
        1
      );
      location.isOpen = some(openings.pickup, opening =>
        currentTime.isBetween(opening.begin, opening.end)
      );
    });
    const resultingLocations = orderBy(locations, ['isOpen'], ['desc']);
    if (resultingLocations.length != 0) {
      await saveCachedLocationsInRadius(targetCacheKey, resultingLocations);
    }
    return resultingLocations;
  }

  async locationsForSearchScreen(
    countryId,
    searchTerm,
    geolocation,
    paging,
    filters
  ) {
    // searchTerm must include at least one character otherwise send empty array for performance reason
    if (!searchTerm) return [];

    // Use the provided geolocation, otherwise look up defaults from the db config
    const { longitude, latitude } =
      geolocation ||
      (await this.db('configuration')
        .select(
          'default_latitude as latitude',
          'default_longitude as longitude'
        )
        .first());

    // We want to hide the distance if its not provided but still order by it
    const distance = geolocation
      ? `ROUND((ST_Distance(ST_Transform(brand_location_addresses.geolocation,7094), ST_Transform(ST_SetSRID(ST_Makepoint(${longitude},${latitude}),4326),7094)))::numeric,2)`
      : 'null';
    const distinctStatement = filters.distinctByBrand
      ? 'distinct on (brands.id) brands.id as brands_id,'
      : '';
    const select = `${distinctStatement} brand_locations.*,
      brand_location_addresses.id as brand_location_address_id,
      brand_location_addresses.short_address,
      brand_location_addresses.short_address_ar,
      brand_location_addresses.short_address_tr,
      brand_location_addresses.neighborhood_id,
      brand_location_addresses.street,
      brand_location_addresses.city,
          brand_location_addresses.city_id,
      ST_X(brand_location_addresses.geolocation) as longitude,
      ST_Y(brand_location_addresses.geolocation) as latitude,
      ${distance} as distance `;
    let query = this.db
      .select('*')
      .from('filtered_brand_locations')
      .with('filtered_brand_locations', qb2 => {
        qb2
          .table('brand_locations')
          .select(this.db.raw(select))
          .join(
            'brand_location_addresses',
            'brand_location_addresses.brand_location_id',
            'brand_locations.id'
          )
          .join('brands', 'brands.id', 'brand_locations.brand_id')
          .where('accepting_orders', true)
          .andWhere(query => {
            query
              .where(
                'brand_location_addresses.short_address',
                'ILIKE',
                `%${searchTerm}%`
              )
              .orWhere('brands.name', 'ILIKE', `%${searchTerm}%`);
          })
          .andWhere('brands.country_id', countryId);
        if (filters.distinctByBrand) {
          query.orderBy('brands.id');
        }
        qb2 = this.filterBrandLocations(query, filters);
      });
    query.orderBy('distance', 'asc');

    if (paging) {
      query = query.offset(paging.offset).limit(paging.limit);
    }
    return query.then(transformToCamelCase);
  }

  async locationsForPickup(brandId, geolocation, paging, filters) {
    // Use the provided geolocation, otherwise look up defaults from the db config
    const { longitude, latitude } =
      geolocation ||
      (await this.db('configuration')
        .select(
          'default_latitude as latitude',
          'default_longitude as longitude'
        )
        .first());

    // We want to hide the distance if its not provided but still order by it
    const distance = geolocation
      ? `ROUND((ST_Distance(ST_Transform(brand_location_addresses.geolocation,7094), ST_Transform(ST_SetSRID(ST_Makepoint(${longitude},${latitude}),4326),7094)))::numeric,2)`
      : 'null';

    const select = `brand_locations.*,
      brand_location_addresses.id as brand_location_address_id,
      brand_location_addresses.short_address,
      brand_location_addresses.short_address_ar,
      brand_location_addresses.short_address_tr,
      brand_location_addresses.neighborhood_id,
      brand_location_addresses.street,
      brand_location_addresses.city,
      brand_location_addresses.city_id,
      ST_X(brand_location_addresses.geolocation) as longitude,
      ST_Y(brand_location_addresses.geolocation) as latitude,
      ${distance} as distance`;

    let query = this.db
      .table('brand_locations')
      .select(this.db.raw(select))
      .join(
        'brand_location_addresses',
        'brand_location_addresses.brand_location_id',
        'brand_locations.id'
      )
      .where('accepting_orders', true)
      .andWhere('brand_locations.brand_id', brandId)
      .andWhere('brand_locations.has_pickup', true)
      .orderBy(
        this.db.raw(
          // See: https://boundlessgeo.com/2011/09/indexed-nearest-neighbour-search-in-postgis/
          `brand_location_addresses.geolocation <-> st_setsrid(st_makepoint(${longitude},${latitude}),4326)`
        )
      );

    if (paging) {
      query = query.offset(paging.offset).limit(paging.limit);
    }
    query = this.filterBrandLocations(query, filters);
    return query.then(transformToCamelCase);
  }

  async getCountryFromIsoOrId(
    countryIso,
    countryId
  ) {
    let country;
    if (countryId) {
      country = await this.context.country.getById(countryId);
    } else if (countryIso) {
      country = await this.context.country.getByCode(countryIso);
    }
    return country;
  }

  async getBrandLocationsInBoundingBox({
    userLocation,
    minLocation,
    maxLocation,
    filters,
    countryIso,
    countryId,
  }) {
    const country = await this.getCountryFromIsoOrId(countryIso, countryId);
    const branchListFromMicroservice = await this.getBranchesInBoundingBox(
      userLocation,
      minLocation,
      maxLocation,
      country ? country.id : null,
      filters ? filters.fulfillmentType : null
    );

    return await this.getBranchesNew(
      branchListFromMicroservice,
      filters,
      country,
      {}
    );
  }

  async getBrandLocationsAroundMe({
    location,
    radius,
    filters,
    paging,
    countryIso,
    countryId,
    omitRadius,
  }) {
    radius = radius ? radius : 7000;
    const country = await this.getCountryFromIsoOrId(countryIso, countryId);

    if (filters && filters.fulfillmentType) {
      if (filters.fulfillmentType === orderFulfillmentTypes.PICKUP
        || filters.fulfillmentType === orderFulfillmentTypes.CAR) {
        if (country) {
          const {
            configurationValue,
          } = (await this.context.countryConfiguration.getByKey(
            orderFulfillmentTypes.CAR
              ? countryConfigurationKeys.CAR_WINDOW_RADIUS
              : countryConfigurationKeys.PICKUP_RADIUS,
            country.id
          )) || {
            configurationValue: orderFulfillmentTypes.CAR ? 15000 : 1000,
          };
          radius = configurationValue;
        }
      }
    } else radius = 15000;

    const { longitude, latitude } = location;
    let branchListFromMicroservice;
    const targetCacheKey = calculateBranchesForHomePage(location, 'isCheckStoreStatus');
    if (filters?.isCheckStoreStatus) {
      const cachedResponse = await getCachedBranchesForHomePage(targetCacheKey);
      if (cachedResponse && cachedResponse.length > 0) {
        const offsetVal = paging?.offset || 0;
        const limitVal = offsetVal + (paging?.limit || cachedResponse.length);
        branchListFromMicroservice = cachedResponse.slice(offsetVal, limitVal);
        paging = null;
        return await this.getBranchesNew(
          branchListFromMicroservice,
          filters,
          country,
          paging
        );
      }
    }
    if (omitRadius && filters.brandId) {
      branchListFromMicroservice = await this.getBranchesOfBrand(
        latitude,
        longitude,
        filters.brandId
      );
    } else if ((!filters || !filters.fulfillmentType) && country) {
      branchListFromMicroservice = await this.getBranchesOfCountry(
        latitude,
        longitude,
        country.id,
      );
    } else {
      branchListFromMicroservice = await this.getBranchesInRadius(
        latitude,
        longitude,
        0,
        radius,
        country ? country.id : null,
        filters ? filters.fulfillmentType : null
      );
    }

    if (filters?.isCheckStoreStatus) {
      const fulfillmentTypes = fulfillmentTypesWithKey.map(key => camelCase(key.type));
      //const fulfillmentTypes = Object.keys(orderTypes).map(key => camelCase(key));
      const { fulfillmentCacheKeys } = branchListFromMicroservice.reduce((result, item) => {
        item.fulfillmentStatus = {};
        result.fulfillmentCacheKeys = [
          ...result.fulfillmentCacheKeys,
          ...fulfillmentTypes.map(fulfillmentType => {
            return calculateBrandLocationStoreAvailabilityKey(
              item.branchId,
              fulfillmentType
            );
          })
        ];
        return result;
      }, { fulfillmentCacheKeys: [] });

      const fulfillmentStatuses = await getCachedStoreStatusByMultipleKeys(
        fulfillmentCacheKeys
      );
      const openLst = [];
      const closeLst = [];
      for (const index in branchListFromMicroservice) {
        const item = branchListFromMicroservice[index];
        let isOpen = false;
        if (!item.acceptingOrders) {
          // closeLst.push(item); // WARN: getBrandLocationsAroundMe is not showing these branches (in future we will use this)
          continue;
        }
        for (let i = 0; i < fulfillmentTypes.length; i++) {
          if (isOpen) {
            break;
          }
          const fulfillmentStatus = JSON.parse(
            fulfillmentStatuses[fulfillmentTypes.length * index + i]
          ) || {
            storeStatus: brandLocationStoreStatusFull.SCHEDULING_INCONSISTENCY
          };
          if (fulfillmentStatus.storeStatus ===
            brandLocationStoreStatus.STORE_OPEN ||
            fulfillmentStatus.storeStatus ===
            brandLocationStoreStatus.STORE_CLOSING_SOON) {
            isOpen = true;
            openLst.push(item);
          }
        }
        if (!isOpen) {
          closeLst.push(item);
        }
      }
      openLst.sort((a, b) => a.distance - b.distance);
      closeLst.sort((a, b) => a.distance - b.distance);
      const lst = [...openLst, ...closeLst];
      if (lst && lst.length > 0) {
        await saveCachedBranchesForHomePage(targetCacheKey, lst);
      }
      if (paging) {
        branchListFromMicroservice = lst.slice(paging.offset, paging.offset + paging.limit);
        paging = null;
      } else {
        branchListFromMicroservice = lst;
      }
      if (branchListFromMicroservice && branchListFromMicroservice.length > 0) {
        return await this.getBranchesNew(
          branchListFromMicroservice,
          filters,
          country,
          paging
        );
      }
    }

    return await this.getBranchesNew(
      branchListFromMicroservice,
      filters,
      country,
      paging
    );
  }

  async getBrandLocationsAroundMePayload(input) {
    const { location, filters, paging, countryId } = input;
    let returningFulFillmentType = orderFulfillmentTypes.PICKUP;
    let filterSetVal = null;

    // filter set scope
    if (filters) {
      const { filterSetId } = filters;
      if (filterSetId) {
        const filterSet = await this.context.filterSet.getById(filterSetId);
        if (filterSet) {
          filterSetVal = filterSet;
          const { tagIds, brandIds, fulfillmentTypes } = filterSet;
          if (tagIds && tagIds.length > 0) {
            filters.tagIds = tagIds;
          }
          if (brandIds && brandIds.length > 0) {
            filters.brandIds = brandIds;
          }
          if (fulfillmentTypes && fulfillmentTypes.length > 0) {
            filters.fulfillmentTypes = fulfillmentTypes;
            if (fulfillmentTypes.includes(orderFulfillmentTypes.PICKUP)) {
              returningFulFillmentType = orderFulfillmentTypes.PICKUP;
            } else {
              returningFulFillmentType = orderFulfillmentTypes[fulfillmentTypes[0]];
            }
          } else {
            returningFulFillmentType = orderFulfillmentTypes.PICKUP;
          }
          filters.fulfillmentType = returningFulFillmentType;
        }
      }
    }
    const branches = await this.getBrandLocationsAroundMe({ location, filters, paging, countryId });

    // TODO: !!! Need to implement SQL pagination, this is very very bad approach !!!
    let pageVal = 1;
    let perPageVal = branches.length;
    if (paging) {
      const { page, perPage } = paging;
      if (page != null && perPage != null) {
        pageVal = page;
        perPageVal = perPage;
      }
    }
    const res = this.addRefreshPaging(branches, pageVal, perPageVal);
    // TODO: !!! Need to implement SQL pagination, this is very very bad approach !!!

    const metaData = this.brandLocationsAroundMePayloadMetaData(filterSetVal, res.paging.total || 0);
    const emptyData = this.brandLocationsAroundMePayloadEmptyData(filterSetVal);

    return {
      ...metaData,
      emptyData: res.results.length > 0 ? null : emptyData,
      fulfillmentType: returningFulFillmentType,
      branches: res.results,
      paging: res.paging,
    };
  }

  brandLocationsAroundMePayloadMetaData(filterSet, total) {
    const commonPart = {
      title: { en: 'Branches', ar: 'الفروع', tr: 'Şubeler' },
      subtitle: {
        en: `${total} ${total > 1 ? 'Branches' : 'Branch'}`,
        ar: `\u202B${total}${total > 1 ? ' الفروع ' : ' فرع '}\u202C`,
        tr: `${total} Şube`,
      },
    };
    if (filterSet) {
      const {
        title,
      } = addLocalizationMultipleFields(filterSet,
        [
          'title',
        ]);

      commonPart.title = title;

      return {
        ...commonPart,
        isSearchable: filterSet?.isSearchable,
        analyticsEventName: filterSet?.analyticsEventName,
      };
    } else {
      return {
        ...commonPart,
        isSearchable: false,
        analyticsEventName: 'custom_branches_no_event',
      };
    }
  }

  brandLocationsAroundMePayloadEmptyData(filterSet) {
    if (filterSet) {
      const {
        emptyDataIcon: icon,
        emptyDataTitle: title,
        emptyDataDescription: description,
        emptyDataButtonTitle: buttonTitle,
      } = addLocalizationMultipleFields(filterSet,
        [
          'emptyDataIcon',
          'emptyDataTitle',
          'emptyDataDescription',
          'emptyDataButtonTitle',
          'emptyDataIcon',
        ]);

      return {
        icon,
        title,
        description,
        buttonTitle,
        deeplink: filterSet.emptyDataDeeplink,
      };
    } else {
      return {
        icon: {
          en: 'https://cdn-icons-png.flaticon.com/512/6598/6598519.png',
          ar: 'https://cdn-icons-png.flaticon.com/512/6598/6598519.png',
          tr: 'https://cdn-icons-png.flaticon.com/512/6598/6598519.png',
        },
        title: {
          en: 'Oops we’re not quite there yet',
          ar: 'عفوًا ، لم نصل بعد تمامًا',
          tr: 'Maalesef henüz tam olarak orada değiliz',
        },
        description: {
          en: 'There are no branches near your location that offer this service. We’re working hard to bring 10 minutes delivery to you soon! Why not try our delivery service in the meantime?',
          ar: 'لا توجد فروع بالقرب من موقعك تقدم هذه الخدمة. نحن نعمل بجد لتقديم 10 دقائق لك التسليم قريبًا! لماذا لا تجرب خدمة التوصيل لدينا في هذه الأثناء؟',
          tr: 'Bulunduğunuz yerin yakınında bu hizmeti sunan şube bulunmamaktadır. Yakında size 10 dakikada teslimat getirmek için çok çalışıyoruz! Neden bu süre zarfında teslimat hizmetimizi denemiyorsunuz?',
        },
        buttonTitle: {
          en: 'https://cdn-icons-png.flaticon.com/512/6598/6598519.png',
          ar: 'https://cdn-icons-png.flaticon.com/512/6598/6598519.png',
          tr: 'https://cdn-icons-png.flaticon.com/512/6598/6598519.png',
        },
        deeplink: 'cofeapp://default',
      };
    }
  }

  async getBranches(
    branchListFromMicroservice,
    filters,
    country,
    paging
  ) {
    filters = filters || { status: brandLocationStatus.ACTIVE };
    const customerId = this.context.auth.id;

    let fulfillmentQuery = null;
    if (filters && filters.fulfillmentType) {
      switch (filters.fulfillmentType) {
        case orderFulfillmentTypes.PICKUP:
        case orderFulfillmentTypes.CAR: {
          fulfillmentQuery =
            filters.fulfillmentType === orderFulfillmentTypes.CAR
              ? 'allow_deliver_to_car'
              : 'has_pickup';
          break;
        }
        case orderFulfillmentTypes.DELIVERY: {
          fulfillmentQuery = 'has_delivery';
          break;
        }
        case orderFulfillmentTypes.EXPRESS_DELIVERY: {
          fulfillmentQuery = 'allow_express_delivery';
          break;
        }
        default:
          break;
      }
    }

    const query = this.roDb(this.viewBranchBrand)
      .select('view_branch_brand.*')
      // .andWhere('country_id', country.id)
      .andWhere('status', brandLocationStatus.ACTIVE);
    if (!filters?.isCheckStoreStatus) {
      query.andWhere('accepting_orders', true);
    }
    // .orderBy('distance');
    if (filters.tagId) {
      query.whereIn('id', this.context.tagRelation.getByRelTypeAndTagId(tagRelationType.BRAND_LOCATION, filters.tagId).select('rel_id'));
    }
    const branchIds = branchListFromMicroservice.map(function (item) {
      return item.branchId;
    });
    query.whereIn('id', branchIds);
    // query.andWhereRaw(withinRadiusQuery, [longitude, latitude, radius]);
    if (fulfillmentQuery) query.andWhere(fulfillmentQuery, true);
    if (filters.brandId) query.andWhere('brand_id', filters.brandId);
    const { limit = 5000, offset = 0 } = paging || {};
    query.limit(limit).offset(offset);
    const items = addLocalizationMultipleFields(await query, ['name', 'brandDescription']);
    // loop through items, add required fields from
    // branchListFromMicroservice, sort items by distance

    const offUntils = await this.roDb('brand_location_devices')
      .select('brand_location_id', 'off_until')
      .where('status', 'PAIRED')
      .whereIn('brand_location_id', branchIds);

    // Discovery credit status
    const expiryDatePreffered = country ? await this.context.discoveryCredit.getDiscoveryCreditExpiryTime(country.id) : 0;
    let discoveryCreditAvailable = moment.unix(expiryDatePreffered).isAfter(moment());

    const fulfillmentTypes = Object.keys(orderTypes).map(key => camelCase(key));
    const { brandIdsSet, fulfillmentCacheKeys } = items.reduce((result, item) => {
      item.fulfillmentStatus = {};
      result.brandIdsSet.add(item.brandId);
      result.fulfillmentCacheKeys = [
        ...result.fulfillmentCacheKeys,
        ...fulfillmentTypes.map(fulfillmentType => {
          return calculateStoreStatusFulfillmentKey(
            item.id,
            fulfillmentType
          );
        })
      ];
      return result;
    }, { brandIdsSet: new Set(), fulfillmentCacheKeys: [] });

    const brands = await this.getBrandsWithIds([...brandIdsSet]);
    const estimatedTimes = await this.context.countryConfiguration.getByKeys(
      [countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP, countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR,
        countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY, countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY],
      brands[0].countryId);

    let estimatedTimeInMinsPickup, estimatedTimeInMinsCar, estimatedTimeInMinsDelivery, estimatedTimeInMinsExpressDelivery = null;
    estimatedTimes.map(estimatedTime => {
      switch (estimatedTime.configurationKey) {
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP:
          estimatedTimeInMinsPickup = estimatedTime.configurationValue;
          break;
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR:
          estimatedTimeInMinsCar = estimatedTime.configurationValue;
          break;
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY:
          estimatedTimeInMinsDelivery = estimatedTime.configurationValue;
          break;
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY:
          estimatedTimeInMinsExpressDelivery = estimatedTime.configurationValue;
          break;
        default:
          break;
      }
    });

    let usedDCForBrands;
    if (discoveryCreditAvailable && customerId && country) {
      const dc = await this.context.discoveryCredit.getByCustomerAndCountryId(
        customerId,
        country.id
      );
      if (dc) {
        usedDCForBrands = await this.roDb('discovery_credit_redemptions')
          .select('brand_id')
          .count('*')
          .where('discovery_credit_id', dc.id)
          .where('refunded', false)
          .whereIn('brand_id', [...brandIdsSet])
          .groupBy('brand_id')
          .havingRaw(`count(*) >= ${dc.noOfOrdersPerBrand}`);
      } else {
        /*
        * if customer deleted him/her account before
        * that's why s/he has not dc record
        * in this case discoveryCreditAvailable should be false
        */
        discoveryCreditAvailable = false;
      }
    }

    const fulfillmentStatuses = await getCachedStoreStatusByMultipleKeys(
      fulfillmentCacheKeys
    );

    for (const index in items) {
      const item = items[index];
      item.discoveryCreditAvailable = usedDCForBrands
        ? !usedDCForBrands.some(dCR => dCR.brandId === item.brandId)
        : discoveryCreditAvailable;

      let closingTime = null;
      let storeStatus = brandLocationStoreStatusFull.STORE_CLOSED;
      let statusDescription = null;
      const busyStatusWithFulfillment = [];
      for (let i = 0; i < fulfillmentTypes.length; i++) {
        const fulfillmentStatus = JSON.parse(
          fulfillmentStatuses[fulfillmentTypes.length * index + i]
        ) || {
          storeStatus: brandLocationStoreStatusFull.SCHEDULING_INCONSISTENCY
        };
        item.fulfillmentStatus[fulfillmentTypes[i]] = fulfillmentStatus;
        if (
          fulfillmentStatus.storeStatus ===
          brandLocationStoreStatus.STORE_OPEN
        ) {
          storeStatus = brandLocationStoreStatusFull.STORE_OPEN;
        } else if (
          storeStatus !== brandLocationStoreStatusFull.STORE_OPEN &&
          fulfillmentStatus.storeStatus ===
          brandLocationStoreStatus.STORE_CLOSING_SOON
        ) {
          storeStatus = brandLocationStoreStatusFull.STORE_CLOSING_SOON;
        }
        if (fulfillmentStatus.opening) {
          if (!closingTime) {
            closingTime = fulfillmentStatus.opening.end;
            statusDescription = {
              en: 'Closing at ' + moment(closingTime).tz(item.timeZoneIdentifier).format('LT'),
              ar: 'Closing at ' + moment(closingTime).tz(item.timeZoneIdentifier).format('LT'),
            };
          } else if (
            moment(closingTime)
              .isAfter(moment(fulfillmentStatus.opening.end))
          ) {
            closingTime = fulfillmentStatus.opening.end;
            statusDescription = {
              en: 'Closing at ' + moment(closingTime).tz(item.timeZoneIdentifier).format('LT'),
              ar: 'Closing at ' + moment(closingTime).tz(item.timeZoneIdentifier).format('LT'),
            };
          }
        }
      }

      if (
        storeStatus !== brandLocationStoreStatusFull.STORE_CLOSED &&
        filters.fulfillmentType
      ) {
        let orderType = null;
        let closingFor = null;
        switch (filters.fulfillmentType) {
          case orderFulfillmentTypes.PICKUP: {
            orderType = camelCase(orderTypes.PICKUP);
            closingFor =
              brandLocationStoreStatusFull.STORE_CLOSED_FOR_PICKUP;
            break;
          }
          case orderFulfillmentTypes.CAR: {
            orderType = camelCase(orderTypes.PICKUP);
            closingFor = brandLocationStoreStatusFull.STORE_CLOSED_FOR_CAR;
            break;
          }
          case orderFulfillmentTypes.DELIVERY: {
            orderType = camelCase(orderTypes.DELIVERY);
            closingFor =
              brandLocationStoreStatusFull.STORE_CLOSED_FOR_DELIVERY;
            break;
          }
          case orderFulfillmentTypes.EXPRESS_DELIVERY: {
            orderType = camelCase(orderTypes.EXPRESS_DELIVERY);
            closingFor =
              brandLocationStoreStatusFull.STORE_CLOSED_FOR_EXPRESS;
            break;
          }
          default:
            break;
        }

        const fulfillmentStatus = item.fulfillmentStatus[orderType];

        if (fulfillmentStatus.storeStatus ===
          brandLocationStoreStatus.STORE_CLOSED ||
          fulfillmentStatus.storeStatus ===
          brandLocationStoreStatus.SCHEDULING_INCONSISTENCY) {
          storeStatus = closingFor;
          closingTime = null;
          statusDescription = {
            en: 'Closed',
            ar: 'Closed',
          };
        } else {
          storeStatus = fulfillmentStatus.storeStatus;
          if (fulfillmentStatus.opening) {
            closingTime = fulfillmentStatus.opening.end;
            statusDescription = {
              en: 'Closing at ' + moment(closingTime).tz(item.timeZoneIdentifier).format('LT'),
              ar: 'Closing at ' + moment(closingTime).tz(item.timeZoneIdentifier).format('LT'),
            };
          } else closingTime = null;
        }
      }
      const deviceObject = offUntils.find(
        time => time.brandLocationId === item.id
      );
      item.isBusy = false;
      if (deviceObject && deviceObject.offUntil) {
        item.isBusy = moment(deviceObject.offUntil).isAfter(moment());
        if (item.hasPickup) {
          busyStatusWithFulfillment.push({
            isBusy: true,
            busyTime: moment(deviceObject.offUntil),
            fulfillmentType: 'PICKUP'
          });
        }
        if (item.allowDeliverToCar) {
          busyStatusWithFulfillment.push({
            isBusy: true,
            busyTime: moment(deviceObject.offUntil),
            fulfillmentType: 'CAR'
          });
        }
        if (item.hasDelivery) {
          busyStatusWithFulfillment.push({
            isBusy: true,
            busyTime: moment(deviceObject.offUntil),
            fulfillmentType: 'DELIVERY'
          });
        }
        if (item.allowExpressDelivery) {
          busyStatusWithFulfillment.push({
            isBusy: true,
            busyTime: moment(deviceObject.offUntil),
            fulfillmentType: 'EXPRESS_DELIVERY'
          });
        }
      }
      item.closingTime = closingTime;
      item.storeStatus = storeStatus;

      item.currentAvailableFulfillments = [];
      if (
        item.fulfillmentStatus.pickup.storeStatus ===
        brandLocationStoreStatus.STORE_OPEN ||
        item.fulfillmentStatus.pickup.storeStatus ===
        brandLocationStoreStatus.STORE_CLOSING_SOON
      ) {
        item.hasPickup && item.currentAvailableFulfillments.push(
          orderFulfillmentTypes.PICKUP
        );
        item.allowDeliverToCar && item.currentAvailableFulfillments.push(
          orderFulfillmentTypes.CAR
        );
      }
      if (
        item.hasDelivery &&
        (item.fulfillmentStatus.delivery.storeStatus ===
          brandLocationStoreStatus.STORE_OPEN ||
          item.fulfillmentStatus.delivery.storeStatus ===
          brandLocationStoreStatus.STORE_CLOSING_SOON)
      ) {
        item.currentAvailableFulfillments.push(orderFulfillmentTypes.DELIVERY);
      }
      if (
        item.allowExpressDelivery &&
        (item.fulfillmentStatus.expressDelivery.storeStatus ===
          brandLocationStoreStatus.STORE_OPEN ||
          item.fulfillmentStatus.expressDelivery.storeStatus ===
          brandLocationStoreStatus.STORE_CLOSING_SOON)
      ) {
        item.currentAvailableFulfillments.push(
          orderFulfillmentTypes.EXPRESS_DELIVERY
        );
      }

      let fulfillmentDescription = {
        en: 'No active fulfillment'
      };
      if (item.currentAvailableFulfillments.length > 0) {
        let fulfillmentDescriptionEn = '';
        let fulfillmentDescriptionAr = '';
        item.currentAvailableFulfillments.map(availableFulfillment => {
          switch (availableFulfillment) {
            case 'PICKUP':
              fulfillmentDescriptionEn += 'Pick up in ' + estimatedTimeInMinsPickup + ' mins /';
              break;
            case 'CAR':
              fulfillmentDescriptionEn += 'Curbside in ' + estimatedTimeInMinsCar + ' mins /';
              break;
            case 'DELIVERY':
              fulfillmentDescriptionEn += 'Delivery in ' + estimatedTimeInMinsDelivery + ' mins /';
              break;
            case 'EXPRESS_DELIVERY':
              fulfillmentDescriptionEn += 'Express Delivery in ' + estimatedTimeInMinsExpressDelivery + ' mins /';
              break;
            default:
              break;
          }
        });
        fulfillmentDescriptionAr = fulfillmentDescriptionEn;
        fulfillmentDescription = {
          en: fulfillmentDescriptionEn,
          ar: fulfillmentDescriptionAr,
        };
      }

      item.branchStatusInfo = {
        status: storeStatus,
        statusDescription,
        fulfillmentDescription,
        busyStatusByFulfillmentType: busyStatusWithFulfillment
      };

      const branchFromMicroservice = branchListFromMicroservice.find(
        o => o.branchId === item.id
      );
      item.latitude = branchFromMicroservice.latitude;
      item.longitude = branchFromMicroservice.longitude;
      item.distance = branchFromMicroservice.distance;
      item.brand = brands.find(o => o.id === item.brandId);
    }

    items.sort((a, b) => a.distance - b.distance);

    return items;
  }

  async getBranchesNew(
    branchListFromMicroservice,
    filters,
    country,
    paging
  ) {
    filters = filters || { status: brandLocationStatus.ACTIVE };
    const customerId = this.context.auth.id;

    let fulfillmentQuery = null;
    if (filters && filters.fulfillmentType) {
      switch (filters.fulfillmentType) {
        case orderFulfillmentTypes.PICKUP:
        case orderFulfillmentTypes.CAR: {
          fulfillmentQuery =
            filters.fulfillmentType === orderFulfillmentTypes.CAR
              ? 'allow_deliver_to_car'
              : 'has_pickup';
          break;
        }
        case orderFulfillmentTypes.DELIVERY: {
          fulfillmentQuery = 'has_delivery';
          break;
        }
        case orderFulfillmentTypes.EXPRESS_DELIVERY: {
          fulfillmentQuery = 'allow_express_delivery';
          break;
        }
        default:
          break;
      }
    }

    const query = this.roDb(this.viewBranchBrand)
      .select('view_branch_brand.*')
      .andWhere('status', brandLocationStatus.ACTIVE)
      .andWhere('accepting_orders', true);
    if (filters.tagId) {
      query.whereIn('id', this.context.tagRelation.getByRelTypeAndTagId(tagRelationType.BRAND_LOCATION, filters.tagId).select('rel_id'));
    }
    const branchIds = branchListFromMicroservice.map(t => t.branchId);
    if (branchIds && branchIds.length > 0) {
      query.whereIn('id', branchIds);
    } else {
      return [];
    }
    if (fulfillmentQuery) query.andWhere(fulfillmentQuery, true);
    if (filters.brandId) query.andWhere('brand_id', filters.brandId);
    const { limit = 5000, offset = 0 } = paging || {};
    query.limit(limit).offset(offset);
    await this.applyFilterSet(query, filters);
    const items = addLocalizationField(await query, 'name');
    if (!items || (items && items.length <= 0)) {
      return [];
    }
    // loop through items, add required fields from
    // branchListFromMicroservice, sort items by distance

    /*
    const offUntils = await this.roDb('brand_location_devices')
      .select('brand_location_id', 'off_until')
      .where('status', 'PAIRED')
      .whereIn('brand_location_id', branchIds);
    */

    // Discovery credit status
    const expiryDatePreffered = country ? await this.context.discoveryCredit.getDiscoveryCreditExpiryTime(country.id) : 0;
    let discoveryCreditAvailable = moment.unix(expiryDatePreffered).isAfter(moment());

    // const fulfillmentTypes = Object.keys(orderTypes).map(key => camelCase(key));
    const fulfillmentTypes = fulfillmentTypesWithKey.map(key => camelCase(key.type));
    const { brandIdsSet, fulfillmentCacheKeys } = items.reduce((result, item) => {
      item.fulfillmentStatus = {};
      result.brandIdsSet.add(item.brandId);
      result.fulfillmentCacheKeys = [
        ...result.fulfillmentCacheKeys,
        ...fulfillmentTypes.map(fulfillmentType => {
          return calculateBrandLocationStoreAvailabilityKey(
            item.id,
            fulfillmentType
          );
        })
      ];
      return result;
    }, {brandIdsSet: new Set(), fulfillmentCacheKeys: []});

    const brands = await this.getBrandsWithIds([...brandIdsSet]);
    const estimatedTimes = await this.context.countryConfiguration.getByKeys(
      [countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP, countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR,
        countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY, countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY],
      brands[0].countryId);
    const currency = addLocalizationField(
      await this.context.currency.getById(items[0].currencyId), 'symbol'
    );

    let estimatedTimeInMinsPickup, estimatedTimeInMinsCar, estimatedTimeInMinsDelivery, estimatedTimeInMinsExpressDelivery = null;
    estimatedTimes.map(estimatedTime => {
      switch (estimatedTime.configurationKey) {
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP:
          estimatedTimeInMinsPickup = estimatedTime.configurationValue;
          break;
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR:
          estimatedTimeInMinsCar = estimatedTime.configurationValue;
          break;
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY:
          estimatedTimeInMinsDelivery = estimatedTime.configurationValue;
          break;
        case countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY:
          estimatedTimeInMinsExpressDelivery = estimatedTime.configurationValue;
          break;
        default:
          break;
      }
    });

    /*
    const { configurationValue: estimatedTimeInMinsPickup } = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP, brands[0].countryId);
    const { configurationValue: estimatedTimeInMinsCar } = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR, brands[0].countryId);
    const { configurationValue: estimatedTimeInMinsDelivery } = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY, brands[0].countryId);
    const { configurationValue: estimatedTimeInMinsExpressDelivery } = await this.context.countryConfiguration.getByKey(countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY, brands[0].countryId);
    */
    let usedDCForBrands;
    if (discoveryCreditAvailable && customerId && country) {
      const dc = await this.context.discoveryCredit.getByCustomerAndCountryId(
        customerId,
        country.id
      );
      if (dc) {
        usedDCForBrands = await this.roDb('discovery_credit_redemptions')
          .select('brand_id')
          .count('*')
          .where('discovery_credit_id', dc.id)
          .where('refunded', false)
          .whereIn('brand_id', [...brandIdsSet])
          .groupBy('brand_id')
          .havingRaw(`count(*) >= ${dc.noOfOrdersPerBrand}`);
      } else {
        /*
        * if customer deleted him/her account before
        * that's why s/he has not dc record
        * in this case discoveryCreditAvailable should be false
        */
        discoveryCreditAvailable = false;
      }
    }

    const fulfillmentStatuses = await getCachedStoreStatusByMultipleKeys(
      fulfillmentCacheKeys
    );

    let ignoreFulfillment = filters.fulfillmentType ? false : true;
    let checkedFulfillmentType = filters.fulfillmentType || null;
    if (filters?.fulfillmentTypes?.length > 0) {
      ignoreFulfillment = false;
      checkedFulfillmentType = filters.fulfillmentTypes.includes(orderFulfillmentTypes.PICKUP) ? orderFulfillmentTypes.PICKUP : filters.fulfillmentTypes[0];
    }

    for (const index in items) {
      const item = items[index];
      const branchFromMicroservice = branchListFromMicroservice.find(
        o => o.branchId === item.id
      );
      item.latitude = branchFromMicroservice.latitude;
      item.longitude = branchFromMicroservice.longitude;
      item.distance = branchFromMicroservice.distance;
      item.brand = brands.find(o => o.id === item.brandId);

      const currentTime = moment().tz(item.timeZoneIdentifier);
      item.discoveryCreditAvailable = usedDCForBrands
        ? !usedDCForBrands.some(dCR => dCR.brandId === item.brandId)
        : discoveryCreditAvailable;

      /**
       * TODO Remove this comment
       * get store status with fulfillmentAVailableNew redis key
       * if fulfillment type is not defined
       *   check all type and
       *    if there is an open status set store is open
       *    if all statuses are closing soon or less one closing soon with closed or busy, set closing soon
       *    if all statuses are busy or less one busy with closed, set busy
       *    if all status closed, set closed
       * if fulfillment type define
       *  check redis
       *    if status open, set open
       *    if status closing soon, set closing soon
       *    if status busy =>
       *       other statuses busy or closed => set busy
       *       less one status is open or closing soon => set busy for this fulfillment
       *    if status closed =>
       *       other statuses busy or closed => set closed
       *       less one status is open or closing soon => set closed for this fulfillment
       */

      item.currentAvailableFulfillments = [];
      let tempStoreStatus = brandLocationStoreStatusFull.STORE_CLOSED;
      let closingTimeTemp = null;
      let openingTimeTemp = null;
      let isBusyTemp = false;
      //let allBusyTemp = true;
      let busyTime = null;
      let isAllDayClosed = true;
      const busyStatusWithFulfillment = [];
      const storeStatusByFulfillmentType = [];
      let statusDescription = null;
      let allWeekClosed = true;
      let openTimeNextWeekDay = null;
      let openNextWeekDay = null;
      let allSchedulesInconsistency = true;
      for (let i = 0; i < fulfillmentTypesWithKey.length; i++) {
        const fulfillmentStatus = JSON.parse(
          fulfillmentStatuses[fulfillmentTypesWithKey.length * index + i]
        ) || {
          storeStatus: brandLocationStoreStatusFull.SCHEDULING_INCONSISTENCY
        };
        if (fulfillmentStatus.storeStatus !== brandLocationStoreStatusFull.SCHEDULING_INCONSISTENCY) {
          if (item[fulfillmentTypesWithKey[i].enableKey]) {
            storeStatusByFulfillmentType.push({
              status: fulfillmentStatus.isBusy ? brandLocationStoreStatusFull.STORE_BUSY : fulfillmentStatus.storeStatus,
              fulfillmentType: fulfillmentTypesWithKey[i].type
            });
            busyStatusWithFulfillment.push({
              isBusy: fulfillmentStatus.isBusy,
              busyTime: fulfillmentStatus.busyTime,
              fulfillmentType: fulfillmentTypesWithKey[i].type
            });
            /*
            if (filters.fulfillmentTypes) {
              if (filters.fulfillmentTypes.includes(fulfillmentTypesWithKey[i].type)) {
                allBusyTemp = allBusyTemp && fulfillmentStatus.isBusy;
              }
            } else {
              allBusyTemp = allBusyTemp && fulfillmentStatus.isBusy;
            }
            */

            allSchedulesInconsistency = false;
            if (fulfillmentStatus.storeStatus !== brandLocationStoreStatus.STORE_CLOSED) {
              item.currentAvailableFulfillments.push(fulfillmentTypesWithKey[i].type);
            }

            if (ignoreFulfillment) {
              isBusyTemp = isBusyTemp || fulfillmentStatus.isBusy;
              isAllDayClosed = isAllDayClosed && fulfillmentStatus.isAllDayClosed;
              if (fulfillmentStatus.busyTime) {
                if (!busyTime || busyTime.isBefore(moment(fulfillmentStatus.busyTime))) {
                  busyTime = moment(fulfillmentStatus.busyTime);
                }
              }
              if (
                fulfillmentStatus.storeStatus ===
                brandLocationStoreStatus.STORE_OPEN
              ) {
                tempStoreStatus = brandLocationStoreStatusFull.STORE_OPEN;
                allWeekClosed = false;
                if (!closingTimeTemp || closingTimeTemp.isBefore(moment(fulfillmentStatus.opening[0].end))) {
                  closingTimeTemp = moment(fulfillmentStatus.opening[0].end);
                }
                if (!openingTimeTemp || openingTimeTemp.isAfter(moment(fulfillmentStatus.opening[0].begin))) {
                  openingTimeTemp = moment(fulfillmentStatus.opening[0].begin);
                }
              } else if (
                fulfillmentStatus.storeStatus ===
                brandLocationStoreStatus.STORE_CLOSING_SOON &&
                tempStoreStatus !== brandLocationStoreStatus.STORE_OPEN
              ) {
                tempStoreStatus = brandLocationStoreStatusFull.STORE_CLOSING_SOON;
                allWeekClosed = false;
                if (!closingTimeTemp || closingTimeTemp.isBefore(moment(fulfillmentStatus.opening[0].end))) {
                  closingTimeTemp = moment(fulfillmentStatus.opening[0].end);
                }
                if (!openingTimeTemp || openingTimeTemp.isAfter(moment(fulfillmentStatus.opening[0].begin))) {
                  openingTimeTemp = moment(fulfillmentStatus.opening[0].begin);
                }
              } else if (fulfillmentStatus.storeStatus === brandLocationStoreStatus.STORE_CLOSED && !fulfillmentStatus.isAllDayClosed) {
                if (!openingTimeTemp || openingTimeTemp.isAfter(moment(fulfillmentStatus.opening[0].begin))) {
                  openingTimeTemp = moment(fulfillmentStatus.opening[0].begin);
                }
                if (!closingTimeTemp || closingTimeTemp.isBefore(moment(fulfillmentStatus.opening[0].end))) {
                  closingTimeTemp = moment(fulfillmentStatus.opening[0].end);
                }
              } else if (fulfillmentStatus.isAllDayClosed) {
                allWeekClosed = allWeekClosed && fulfillmentStatus.allWeekClosed;
                if (!isNaN(parseInt(fulfillmentStatus.openNextWeekDay))) {
                  if (isNaN(parseInt(openNextWeekDay))) {
                    openNextWeekDay = fulfillmentStatus.openNextWeekDay;
                    openTimeNextWeekDay = fulfillmentStatus.openTimeNextWeekDay;
                  } else {
                    const current = moment();
                    let nextDay = current.clone().weekday(openNextWeekDay);
                    nextDay = nextDay.isBefore(current) ? nextDay.add(7, 'days') : nextDay;
                    const nextDayOpenTime = openTimeNextWeekDay.split(':');
                    nextDay.set({
                      hour: nextDayOpenTime[0],
                      minute: nextDayOpenTime[1],
                      second: nextDayOpenTime[2],
                      millisecond: 0,
                    });
                    let tempNextDay = current.clone().day(fulfillmentStatus.openNextWeekDay);
                    tempNextDay = tempNextDay.isBefore(current) ? tempNextDay.add(7, 'days') : tempNextDay;
                    const tempNextDayOpenTime = fulfillmentStatus.openTimeNextWeekDay.split(':');
                    tempNextDay.set({
                      hour: tempNextDayOpenTime[0],
                      minute: tempNextDayOpenTime[1],
                      second: tempNextDayOpenTime[2],
                      millisecond: 0,
                    });
                    if (tempNextDay.isBefore(nextDay)) {
                      openNextWeekDay = fulfillmentStatus.openNextWeekDay;
                      openTimeNextWeekDay = fulfillmentStatus.openTimeNextWeekDay;
                    }
                  }
                }
              }
            } else if (checkedFulfillmentType == fulfillmentTypesWithKey[i].type) {
              tempStoreStatus = fulfillmentStatus.storeStatus;
              isBusyTemp = fulfillmentStatus.isBusy;
              isAllDayClosed = fulfillmentStatus.isAllDayClosed;
              if (isAllDayClosed) {
                allWeekClosed = fulfillmentStatus?.allWeekClosed || false;
                openNextWeekDay = isNaN(fulfillmentStatus.openNextWeekDay) ? null : fulfillmentStatus.openNextWeekDay;
                openTimeNextWeekDay = fulfillmentStatus?.openTimeNextWeekDay || null;
              }
              if (fulfillmentStatus.opening.length > 0) {
                closingTimeTemp = moment(fulfillmentStatus.opening[0].end);
                openingTimeTemp = moment(fulfillmentStatus.opening[0].begin);
              }
            }
          }
        } else {
          if (item[fulfillmentTypesWithKey[i].enableKey]) {
            storeStatusByFulfillmentType.push({
              status: brandLocationStoreStatusFull.STORE_CLOSED,
              fulfillmentType: fulfillmentTypesWithKey[i].type
            });
          }
        }
      }
      if (tempStoreStatus !== brandLocationStoreStatusFull.STORE_CLOSED) {
        if (currentTime.isSame(closingTimeTemp, 'day')) {
          statusDescription = {
            en: `Closing at ${closingTimeTemp.tz(item.timeZoneIdentifier).format('LT')}`,
            ar: '\u202B يغلق الساعة \u202C' + `\u202A${closingTimeTemp.tz(item.timeZoneIdentifier).format('hh:mm')}\u202C` + (closingTimeTemp.tz(item.timeZoneIdentifier).format('A') == 'AM' ? ('\u202Bص\u202C') : ('\u202Bم\u202C')),
            tr: `${closingTimeTemp.tz(item.timeZoneIdentifier).format('LT')}'da kapanıyor`
          };
        } else {
          const weekDaysTranslateObj = weekDaysTranslate[closingTimeTemp.day()];
          statusDescription = {
            en: `Closing ${weekDaysTranslateObj.en} at ${closingTimeTemp.tz(item.timeZoneIdentifier).format('LT')}`,
            ar: '\u202B يغلق الساعة \u202C' + `\u202A${closingTimeTemp.tz(item.timeZoneIdentifier).format('hh:mm')}\u202C` + (closingTimeTemp.tz(item.timeZoneIdentifier).format('A') == 'AM' ? ('\u202Bص\u202C') : ('\u202Bم\u202C')),
            tr: `${weekDaysTranslateObj.tr} ${closingTimeTemp.tz(item.timeZoneIdentifier).format('LT')}'da kapanıyor`
          };
        }

      } else {
        if (allSchedulesInconsistency) {
          tempStoreStatus = brandLocationStoreStatusFull.STORE_CLOSED;
          statusDescription = {
            en: 'Closed',
            ar: 'مغلق',
            tr: 'Kapalı'
          };
        } else {
          tempStoreStatus = isBusyTemp ?
            brandLocationStoreStatusFull.STORE_BUSY :
            brandLocationStoreStatusFull.STORE_CLOSED;
          /*
          if (!ignoreFulfillment && item.currentAvailableFulfillments.length > 0 && tempStoreStatus == brandLocationStoreStatusFull.STORE_CLOSED) {
            const forFulfillment = tempStoreStatus + '_FOR_' + checkedFulfillmentType;
            tempStoreStatus = brandLocationStoreStatusFull[forFulfillment];
          }
          */
          if (isAllDayClosed) {
            if (allWeekClosed) {
              statusDescription = {
                en: 'Closed for all week',
                ar: '\u202Bمغلق طوال الأسبوع\u202C',
                tr: 'Bütün hafta kapalı'
              };
            } else {
              if (isBusyTemp) {
                statusDescription = {
                  en: 'Busy, not currently accepting orders',
                  ar: '\u202Bمشغول، لا يستقبل طلبات حاليًا \u202C ',
                  tr: 'Meşgul, şu anda sipariş kabul edilmiyor'
                };
              } else {
                const time = moment().tz(item.timeZoneIdentifier);
                const nextDayOpenTime = openTimeNextWeekDay.split(':');
                time.set({
                  hour: nextDayOpenTime[0],
                  minute: nextDayOpenTime[1],
                  second: nextDayOpenTime[2],
                  millisecond: 0,
                });
                statusDescription = {
                  en: 'Closed, opens ' + weekDaysTranslate[openNextWeekDay].en + ' at ' + time.format('LT'),
                  ar: `\u202B ${time.tz(item.timeZoneIdentifier).format('A') == 'AM' ? 'صباحًا' : 'مساءً'} ${time.tz(item.timeZoneIdentifier).format('hh:mm')}\u202C` + `\u202B الساعة ${weekDaysTranslate[openNextWeekDay].ar}مغلق، يفتح في يوم\u202C `,
                  tr: `Kapalı, ${weekDaysTranslate[openNextWeekDay].tr} ${time.tz(item.timeZoneIdentifier).format('A') == 'AM' ? 'sabah' : 'öğleden sonra'} ${time.tz(item.timeZoneIdentifier).format('hh:mm')}'da açılır`
                };
              }

            }
          } else {
            if (isBusyTemp) {
              statusDescription = {
                en: 'Busy, not currently accepting orders',
                ar: '\u202Bمشغول، لا يستقبل طلبات حاليًا \u202C ',
                tr: 'Meşgul, şu anda sipariş kabul edilmiyor'
              };
            } else {
              statusDescription = {
                en: 'Closed, opens at ' + openingTimeTemp.tz(item.timeZoneIdentifier).format('LT'),
                ar: `\u202B ${openingTimeTemp.tz(item.timeZoneIdentifier).format('A') == 'AM' ? 'صباحًا' : 'مساءً'} ${openingTimeTemp.tz(item.timeZoneIdentifier).format('hh:mm')}\u202C` + '\u202Bالمحل مغلق. سيفتح عند الساعة\u202C',
                tr: `Kapalı, ${openingTimeTemp.tz(item.timeZoneIdentifier).format('A') == 'AM' ? 'sabah' : 'öğleden sonra'} ${openingTimeTemp.tz(item.timeZoneIdentifier).format('hh:mm')}'da açılır`
              };
            }
          }
        }
      }

      item.closingTime = closingTimeTemp;
      item.storeStatus = tempStoreStatus;

      let fulfillmentDescription = null;
      /*
      {
        en: 'No active fulfillment',
        ar: '\u202Bلا يوجد خدمة متاحة حالياً\u202C',
        tr: 'Aktif hizmet yok'
      };
      */
      if (item.currentAvailableFulfillments.length > 0) {
        const fulfillmentDescriptionEn = [];
        let fulfillmentDescriptionAr = '';
        const fulfillmentDescriptionTr = [];
        item.currentAvailableFulfillments.map(availableFulfillment => {
          const brand = brands.find(brand => brand.id == item.brandId);
          switch (availableFulfillment) {
            case 'PICKUP':
              if (ignoreFulfillment || checkedFulfillmentType == availableFulfillment) {
                fulfillmentDescriptionEn.push('Pick up in ' + estimatedTimeInMinsPickup + ' mins');
                fulfillmentDescriptionTr.push(estimatedTimeInMinsPickup + ' dakika içinde teslim alın');
                fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                  ? `\u202Bدقيقة ${estimatedTimeInMinsPickup} يمكنك استلام الطلب بعد \u202C`
                  : fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsPickup} يمكنك استلام الطلب بعد \u202C`;
                const walkInMin = Math.ceil((parseInt(item.distance) + 1) / 55);
                if (walkInMin <= 60) {
                  fulfillmentDescriptionEn.push(walkInMin > 1 ? `Est. walking time ${walkInMin} mins` : `Est. walking time ${walkInMin} min`);
                  fulfillmentDescriptionTr.push(`Tahmini yürüme süresi ${walkInMin} dakika`);
                  fulfillmentDescriptionAr = `\u202B ${estimatedTimeInMinsPickup} الوقت المتوقع للمشي /\u202C` + fulfillmentDescriptionAr;
                } else if (walkInMin <= 120) {
                  fulfillmentDescriptionEn.push('Over 1 hour');
                  fulfillmentDescriptionTr.push('1 saatten fazla');
                  fulfillmentDescriptionAr = '\u202B أكثر من ساعة /\u202C' + fulfillmentDescriptionAr;
                } else {
                  fulfillmentDescriptionEn.push('Out of walking zone');
                  fulfillmentDescriptionTr.push('Yürüme alanı dışında');
                  fulfillmentDescriptionAr = '\u202B خارج منطقة المشي /\u202C' + fulfillmentDescriptionAr;
                }
              }
              break;
            case 'CAR':
              if (ignoreFulfillment || checkedFulfillmentType == availableFulfillment) {
                fulfillmentDescriptionEn.push('Served to your car within ' + estimatedTimeInMinsCar + ' mins');
                fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                  ? `\u202Bدقيقة ${estimatedTimeInMinsCar} يمكنك استلام الطلب بعد \u202C`
                  : fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsCar} يمكنك استلام الطلب بعد \u202C`;
                fulfillmentDescriptionTr.push(estimatedTimeInMinsCar + ' dakika içinde araçınızla teslim alın');
              }
              break;
            case 'DELIVERY':
              if (ignoreFulfillment || checkedFulfillmentType == availableFulfillment) {
                let textEn = 'Delivery in ' + estimatedTimeInMinsDelivery + ' mins';
                let textTr = estimatedTimeInMinsDelivery + ' dakika içinde teslimat';
                if (!brand.deliveryFee || brand.deliveryFee <= 0) {
                  textEn += ' - Free';
                  textTr += ' - Ücretsiz';
                  fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0 ?
                    `\u202Bدقيقة ${estimatedTimeInMinsDelivery} سيتم التوصيل بعد \u202C` + '\u202B مجانًا \u202C' :
                    fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsDelivery} سيتم التوصيل بعد \u202C` + '\u202B مجانًا \u202C';
                } else {
                  const deliveryFee = new Money(
                    brand.deliveryFee,
                    currency.decimalPlace,
                    currency.lowestDenomination
                  );
                  textEn += ` - Delivery charges ${currency.symbol.en} ${deliveryFee}`;
                  fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0 ?
                    `\u202Bدقيقة ${estimatedTimeInMinsDelivery} سيتم التوصيل بعد \u202C` + `\u202B ${currency.symbol.ar} ${deliveryFee} رسوم التوصيل \u202C` :
                    fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsDelivery} سيتم التوصيل بعد \u202C` + `\u202B ${currency.symbol.ar} ${deliveryFee} رسوم التوصيل \u202C`;
                  textTr += ` - Teslimat ücreti ${currency.symbol.tr} ${deliveryFee}`;
                }
                fulfillmentDescriptionEn.push(textEn);
                fulfillmentDescriptionTr.push(textTr);
                /*
                fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                  ? `\u202Bدقيقة ${estimatedTimeInMinsDelivery} سيتم التوصيل بعد \u202C`
                  : fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsDelivery} سيتم التوصيل بعد \u202C`;
                fulfillmentDescriptionTr.push(estimatedTimeInMinsDelivery + ' dakika içinde teslimat');
                */
              }
              break;
            case 'EXPRESS_DELIVERY':
              if (ignoreFulfillment || checkedFulfillmentType == availableFulfillment) {
                let textEn = 'Express Delivery in ' + estimatedTimeInMinsDelivery + ' mins';
                let textTr = estimatedTimeInMinsDelivery + ' dakika içinde ekspres teslimat';
                if (!brand.expressDeliveryFee || brand.expressDeliveryFee <= 0) {
                  textEn += ' - Free';
                  textTr += ' - Ücretsiz';
                  fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                    ? `\u202Bدقيقة ${estimatedTimeInMinsExpressDelivery} سيتم التوصيل السريع خلال \u202C` + '\u202B مجانًا \u202C'
                    : fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsExpressDelivery} سيتم التوصيل السريع خلال \u202C` + '\u202B مجانًا \u202C';
                } else {
                  const deliveryFee = new Money(
                    brand.expressDeliveryFee,
                    currency.decimalPlace,
                    currency.lowestDenomination
                  );
                  textEn += ` - Delivery charges ${currency.symbol.en} ${deliveryFee}`;
                  textTr += ` - Teslimat ücreti ${currency.symbol.tr} ${deliveryFee}`;
                  fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                    ? `\u202Bدقيقة ${estimatedTimeInMinsExpressDelivery} سيتم التوصيل السريع خلال \u202C` + `\u202B ${currency.symbol.ar} ${deliveryFee} رسوم التوصيل \u202C`
                    : fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsExpressDelivery} سيتم التوصيل السريع خلال \u202C` + `\u202B ${currency.symbol.ar} ${deliveryFee} رسوم التوصيل \u202C`;
                }
                fulfillmentDescriptionEn.push(textEn);
                fulfillmentDescriptionTr.push(textTr);
                /*
                fulfillmentDescriptionAr = fulfillmentDescriptionAr.length == 0
                  ? `\u202Bدقيقة ${estimatedTimeInMinsExpressDelivery} سيتم التوصيل السريع خلال \u202C`
                  : fulfillmentDescriptionAr + `\u202B/ دقيقة ${estimatedTimeInMinsExpressDelivery} سيتم التوصيل السريع خلال \u202C`;
                fulfillmentDescriptionTr.push(estimatedTimeInMinsExpressDelivery + ' dakika içinde ekspres teslimat');
                */
              }
              break;
            default:
              break;
          }
        });
        fulfillmentDescription = {
          en: fulfillmentDescriptionEn.join(' / '),
          ar: fulfillmentDescriptionAr,
          tr: fulfillmentDescriptionTr.join(' / '),
        };
      }
      item.branchStatusInfo = {
        status: tempStoreStatus,
        statusDescription,
        fulfillmentDescription,
        busyStatusByFulfillmentType: busyStatusWithFulfillment,
        statusByFulfillmentType: storeStatusByFulfillmentType
      };
      item.storeStatusSortIndex = brandLocationStoreStatusFull.STORE_CLOSED == item.storeStatus ?
        2 : (brandLocationStoreStatusFull.STORE_BUSY == item.storeStatus ? 1 : 0);
    }

    items.sort((a, b) => a.storeStatusSortIndex - b.storeStatusSortIndex || a.distance - b.distance);

    return items;
  }

  async applyFilterSet(query, filters) {
    if (filters.tagIds && filters.tagIds.length > 0) {
      const brandLocationsByTags = await (this.context.tagRelation.getByRelTypeAndTagIds(tagRelationType.BRAND_LOCATION, filters?.tagIds).select('rel_id'));
      const brandLocationIds = brandLocationsByTags.map(t => t.relId);
      const uniqBrandLocationIds = [...new Set([...brandLocationIds, filters.tagId].filter(t => !!t))];
      // Important: If there are old branchIds we need to delete them firstly for this scope
      const existWhereForBranchIds = query._statements.find(item => (item.grouping === 'where' && item.type === 'whereIn' && item.not === false && item.column === 'id'));
      if (existWhereForBranchIds) {
        const existBranchIds = existWhereForBranchIds.value;
        const intersectBranchIds = existBranchIds.filter(t => uniqBrandLocationIds.includes(t));
        query.whereIn('id', intersectBranchIds);
      } else {
        query.whereIn('id', uniqBrandLocationIds);
      }
    }

    if (filters.brandIds && filters.brandIds.length > 0) {
      const uniqueBrandIds = [...new Set([...filters.brandIds, filters.brandId].filter(t => !!t))];
      query.whereIn('brandId', uniqueBrandIds);
    }

    if (filters.fulfillmentTypes && filters.fulfillmentTypes.length > 0) {
      const columnByFulfillmentType = (fulfillmentType) => {
        switch (fulfillmentType) {
          case orderFulfillmentTypes.PICKUP:
            return 'has_pickup';
          case orderFulfillmentTypes.CAR:
            return 'allow_deliver_to_car';
          case orderFulfillmentTypes.DELIVERY:
            return 'has_delivery';
          case orderFulfillmentTypes.EXPRESS_DELIVERY:
            return 'allow_express_delivery';
          default:
            return null;
        }
      };

      const fulfillmentsQuery = [];
      filters?.fulfillmentTypes.forEach((fulfillmentType) => {
        fulfillmentsQuery.push(columnByFulfillmentType(fulfillmentType));
      });
      if (fulfillmentsQuery && fulfillmentsQuery.length > 0) {
        const fulfillments = [...new Set([...fulfillmentsQuery, columnByFulfillmentType(filters?.fulfillmentType)].filter(t => !!t))];
        let queryText = fulfillments.join(' = true OR ');
        queryText += ' = true';
        query.whereRaw(`( ${queryText})`);
        /*
        fulfillments.forEach((fulfillment) => {
          query.andWhere(fulfillment, true);
        });
        */
      }
    }

    return query;
  }

  async getBrandsWithIds(brandIds) {
    const query = this.roDb('brands')
      .select('*')
      .whereIn('id', brandIds);
    return query;
  }

  async brandsForDiscoveryCreditsByCountryId({
    location,
    countryId,
    filters,
    paging,
    customerId,
    radius,
  }) {
    const {
      configurationValue,
    } = (await this.context.countryConfiguration.getByKey(
      countryConfigurationKeys.PICKUP_RADIUS,
      countryId
    )) || { configurationValue: 1000 };

    radius = configurationValue;

    filters = filters || { status: brandLocationStatus.ACTIVE };
    const { longitude, latitude } = location;

    const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCountryId(
      customerId,
      countryId
    );
    if (discoveryCredit) {
      let query = this.roDb('brands');

      const select = `brands.*,
      case when nearby_branches is not null then  nearby_branches else 0 end as nearby_branches_count,
      distance, case when redemption_count is not null then  redemption_count else 0 end as redemption_availed
        `;

      query = query
        .select(this.roDb.raw(select))

        .with('with_discovery_redemptions', qb1a => {
          qb1a
            .with('with_nearby_branches', qb2 => {
              qb2
                .select(
                  this.roDb.raw(
                    `
                    sum(case when ST_DWithin( ST_Transform(brand_location_addresses.geolocation, 7094), ST_Transform(ST_SetSRID(ST_MakePoint(?, ?), 4326), 7094), ? ) = true  then 1 else 0 end) as nearby_branches,

                    min(ROUND((ST_Distance(ST_Transform(brand_location_addresses.geolocation,7094), ST_Transform(ST_SetSRID(ST_Makepoint(?, ?),4326),7094)) / 1000)::numeric,2)) as distance,
                    brand_locations.brand_id as u_brand_id`,
                    [longitude, latitude, radius, longitude, latitude]
                  )
                )
                .from('brand_locations')
                .join(
                  'brand_location_addresses',
                  'brand_location_addresses.brand_location_id',
                  'brand_locations.id'
                )
                .join('brands', 'brands.id', 'brand_locations.brand_id')
                .where('brand_locations.status', filters.status)
                .where('brands.country_id', countryId)
                .where('accepting_orders', true)
                .groupBy('u_brand_id');
            })
            .select(
              this.roDb.raw(
                'count(discovery_credit_redemptions.id) as redemption_count, u_brand_id, min(distance) as distance, max(nearby_branches) as nearby_branches'
              )
            )
            .from('with_nearby_branches')
            .joinRaw(
              `left join discovery_credit_redemptions
              on discovery_credit_redemptions.brand_id = with_nearby_branches.u_brand_id
              and discovery_credit_redemptions.refunded = false
              and discovery_credit_redemptions.discovery_credit_id = ?`,
              [discoveryCredit.id]
            )
            // .joinRaw(
            //   `inner join discovery_credits on discovery_credits.id = discovery_credit_redemptions.discovery_credit_id and discovery_credits.customer_id = ? and discovery_credits.country_id = ?`,
            //   [customerId, countryId]
            // )
            .groupBy('u_brand_id');
        })

        // Finally we take this list and join for the rest of the columns we need
        .leftJoin(
          'with_discovery_redemptions',
          'brands.id',
          'with_discovery_redemptions.u_brand_id'
        )
        .where('brands.status', filters.status)
        .where('brands.country_id', countryId);

      query = query

        .orderBy('redemption_availed', 'asc')
        .orderBy('distance', 'asc');

      // console.log(query.toString());

      let brands = addLocalizationField(await addPaging(query, paging), 'name');

      brands = map(brands, b => {
        return {
          brand: b,
          nearByBranchesCount: b.nearbyBranchesCount,
          distance: b.distance,
          redeemedForBrand: b.redemptionAvailed,
          brandRedemptionLimit: discoveryCredit.noOfOrdersPerBrand,
        };
      });
      return brands;
    }
    return [];
  }

  async brandsDiscoveryCreditEnabledByCountryId({
    location,
    countryId,
    customerId,
  }) {
    const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCountryId(
      customerId,
      countryId
    );
    const { longitude, latitude } = location;
    if (discoveryCredit) {
      const select = `brands.*, case when dcu.redemption_count is not null then dcu.redemption_count else 0 end as redemption_count,
        case when bl.branch_count is not null then bl.branch_count else 0 end as branch_count`;
      const query = this.roDb('brands')
        .select(this.roDb.raw(select))
        .joinRaw(
          `left join (
            SELECT count(*) as redemption_count, brand_id FROM discovery_credit_redemptions
            WHERE refunded = false and discovery_credit_id = ?
            GROUP BY brand_id
          ) as dcu ON brands.id = dcu.brand_id`, [discoveryCredit.id]
        )
        .joinRaw(
          `left join (
            SELECT count(*) as branch_count, brand_id FROM brand_locations bl
            WHERE status = ?
            GROUP BY brand_id
          ) as bl ON brands.id = bl.brand_id`, [brandLocationStatus.ACTIVE]
        )
        .where('countryId', countryId);

      let brands = addLocalizationField(await query, 'name');
      brands = await Promise.all(
        brands = map(brands, async b => {
          if (b.redemptionCount > 0 || b.status === brandStatus.ACTIVE) {
            let distance = null;
            if (b.status === brandStatus.ACTIVE) {
              const branchListFromMicroservice = await this.getBranchesOfBrand(
                latitude,
                longitude,
                b.id
              );
              if (branchListFromMicroservice.length > 0) {
                distance = branchListFromMicroservice[0].distance;
              }
            }
            return {
              brand: b,
              nearByBranchesCount: b.status === brandLocationStatus.ACTIVE ? b.branchCount : 0,
              redeemedForBrand: b.redemptionCount,
              brandRedemptionLimit: discoveryCredit.noOfOrdersPerBrand,
              distance
            };
          } else return null;
        })
      );
      brands = brands.filter(n => n);
      brands.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        } else if (a.distance === null) {
          return 1;
        } else return 0;
      });
      return brands;
    }
    return [];
  }

  async save(brandLocation) {
    // Attach Fulfilment info to brandLocation
    forEach(brandLocation.availableFulfillment, (value, key) => {
      key = 'has_' + key;
      brandLocation[key] = value;
    });
    const authProviderPassword = '';
    let country;
    // we add time zone identifier only if is a new branch
    let newBranch = false;
    if (!brandLocation.id) {
      newBranch = true;
      country = await this.context.brand.getCountry(brandLocation.brandId);
      brandLocation.timeZoneIdentifier = country.timeZoneIdentifier;
    } else {
      if (brandLocation.acceptingOrders) {
        await this.db('brand_location_devices')
          .where('brand_location_id', brandLocation.id)
          .andWhere('status', 'PAIRED')
          .update({ offUntil: null });
      }
      await this.context.events.saveTotalClosingHours(brandLocation.id, Boolean(brandLocation.acceptingOrders));
    }

    if (brandLocation.contact) {
      brandLocation.contact = JSON.stringify(brandLocation.contact);
    } else {
      brandLocation.contact = JSON.stringify([]);
    }

    const brandLocationId = await super.save(
      omit(brandLocation, [
        'address',
        'deliveryLocation',
        'availableFulfillment',
        'neighborhoods',
        'deviceCode',
        'brandLocationAdmins',
        'tagIds'
      ])
    );
    let admins;
    if (brandLocation.id) {
      await invalidateMenuForBrandLocation.apply({ db: this.db }, [
        brandLocationId,
      ]);
    }
    if (!isTest) {
      // New BrandLocation, create Auth0 user
      /* eslint-disable camelcase */
      const brandLocationAdmins = brandLocation.brandLocationAdmins || [];
      const promisesAddDB = [];
      const promisesDelDB = [];

      if (brandLocationAdmins.length > 0) {
        forEach(brandLocationAdmins, async el => {
          if (el.deleted === true) {
            promisesDelDB.push(
              this.context.admin.deleteAdminForBrand({
                brandId: brandLocation.brandId,
                brandLocationId,
                email: el.email,
              })
            );
          } else {
            promisesAddDB.push(
              this.context.admin.addAdminForBrand({
                brandId: brandLocation.brandId,
                brandLocationId,
                name: el.contactName,
                email: el.email,
                status: 'ACTIVE',
              })
            );
          }
        });
      }

      admins = filter(
        map(await Promise.all(promisesAddDB), n => {
          return n;
        }),
        n => {
          return n !== null;
        }
      );
      await Promise.all(promisesDelDB);
    }

    // If this brand location previously (but no
    // longer) had delivery as a fulfillment option,
    // we need to clear out any other locations that
    // were using them for fulfillment. Don't execute
    // if creating a new brand location.
    if (!brandLocation.has_delivery && brandLocation.id) {
      await this.db(this.tableName)
        .where('delivery_location_id', brandLocation.id)
        .update({
          deliveryLocationId: null,
        });
    }

    if (brandLocation.neighborhoods && brandLocation.neighborhoods.length > 0) {
      await this.context.neighborhood.saveForBrandLocation(
        brandLocationId,
        brandLocation.neighborhoods
      );
    }

    let brandLocationAddressToSave = extend({}, brandLocation.address, {
      brandLocationId,
    });

    // Check if this location already has an address and update it instead
    const currentBrandLocationAddress = await this.context.brandLocationAddress.getByBrandLocation(
      brandLocationId
    );

    if (
      currentBrandLocationAddress !== undefined &&
      currentBrandLocationAddress !== null
    ) {
      brandLocationAddressToSave.id = currentBrandLocationAddress.id;
    }
    brandLocationAddressToSave = removeLocalizationField(
      brandLocationAddressToSave,
      'shortAddress'
    );
    await this.context.brandLocationAddress.save(brandLocationAddressToSave);

    if (
      brandLocation.deviceCode !== undefined &&
      brandLocation.deviceCode !== null
    ) {
      await this.context.brandLocationDevice.pairDeviceWithBrandLocation({
        code: brandLocation.deviceCode,
        brandLocationId: brandLocation.id,
      });
    }

    const city = await this.context.city.getById(brandLocation.address.cityId);
    const menu = await this.context.menu.getByBrandAndCountry(
      brandLocation.brandId,
      city.countryId
    );
    if (!menu) {
      await this.context.menu.save({
        brandId: brandLocation.brandId,
        countryId: city.countryId,
      });

    } else if (newBranch) {
      await this.context.menuItem.setMenuItemStasusForBrandLocation(brandLocationId, menu);
    }

    const brand = await this.context.brand.getById(brandLocation.brandId);
    if (brandLocation.status === 'ACTIVE') {
      country = country
        ? country
        : await this.context.brand.getCountry(brandLocation.brandId);
      brandLocation.id = brandLocationId;
      if (brand.status === brandStatus.HASNOBRANCH) {
        await this.db('brands')
          .where({ id: brandLocation.brandId })
          .update('status', brandStatus.ACTIVE);
      }
    } else {
      const activeBranches = await this.getByBrand(brandLocation.brandId, null, { status: brandLocationStatus.ACTIVE });
      if (activeBranches.length === 0 && brand.status !== brandStatus.DELETED) {
        await this.db('brands')
          .where({ id: brandLocation.brandId })
          .update('status', brandStatus.HASNOBRANCH);
      }
    }
    if (brandLocationId) {
      this.loaders.byId.clear(brandLocationId);
      const res = await this.context.tagRelation.saveBulkForBrandLocation(brandLocationId, brandLocation?.tagIds);
      if (res?.errors?.length > 0)
        throw new Error('INVALID_TAG');
    }
    return { brandLocationId, authProviderPassword, admins };
  }

  async validate(brandLocation) {
    const errors = [];
    let errorDescription = '';
    const validBrand = await this.context.brand.isValid({
      id: brandLocation.brandId,
    });

    if (!validBrand) {
      errors.push(brandLocationError.INVALID_BRAND);
    }

    if (
      brandLocation.deliveryLocation !== undefined &&
      brandLocation.deliveryLocation !== null
    ) {
      const validBrandLocation = await this.context.brandLocation.isValid({
        id: brandLocation.deliveryLocation,
      });

      if (!validBrandLocation) {
        errors.push(brandLocationError.INVALID_DELIVERY_LOCATION);
      }
    }

    if (
      brandLocation.contact &&
      Array.isArray(brandLocation.contact) &&
      brandLocation.contact.length > 0
    ) {
      const primaryContacts = filter(
        brandLocation.contact,
        c => c.isPrimary === true
      );
      if (primaryContacts && primaryContacts.length === 0) {
        errors.push(brandLocationError.ONE_PRIMARY_COONTACT_REQUIRED);
      } else if (primaryContacts && primaryContacts.length > 1) {
        errors.push(brandLocationError.ONLY_ONE_PRIMARY_COONTACT_ALLOWED);
      }
    }

    const currency = await this.context.currency.getById(
      brandLocation.currencyId
    );
    if (!currency) {
      errors.push(brandLocationError.INVALID_CURRENCY);
    }

    if (brandLocation.allowExpressDelivery) {
      if (isNaN(brandLocation.expressDeliveryRadius)) {
        errors.push(brandLocationError.EXPRESS_DELIVERY_RADIUS_REQUIRED);
      }
    }

    const promisesAdminAlreadyExists = [];
    const brandLocationAdmins = brandLocation.brandLocationAdmins ? brandLocation.brandLocationAdmins : [];
    const uniqueEmails = [];
    forEach(brandLocationAdmins, e => {
      if (!e.deleted) {
        if (uniqueEmails.indexOf(e.email) === -1) {
          uniqueEmails.push(e.email);
          promisesAdminAlreadyExists.push(
            this.context.brandAdmin.isAlreadyBrandAdmin(e.email)
          );
        } else {
          errors.push(brandLocationError.ADMIN_ALREADY_EXISTS);
          errorDescription = `${e.email} is already an admin of another brand or branch`;
        }
      }
    });

    const result = await Promise.all(promisesAdminAlreadyExists);
    forEach(result, r => {
      if (
        r !== undefined &&
        (r.brand_id || r.brand_location_id) &&
        r.brand_location_id !== brandLocation.id
      ) {
        errors.push(brandLocationError.ADMIN_ALREADY_EXISTS);
        errorDescription = `${r.email} is already an admin of`;
        const brandMessage = r.brand_name ? `(${r.brand_name})` : '';
        const brandLocationMessage = r.brand_location_name
          ? `(${r.brand_location_name})`
          : '';
        if (brandLocationMessage) {
          errorDescription += ` branch ${brandLocationMessage} for brand ${brandMessage}`;
        } else {
          errorDescription += ` brand ${brandMessage}`;
        }
      }
    });
    return { errors, errorDescription };
  }

  async calculateMenu(brandLocationId) {
    const { redis } = this.context;
    const redisKeyWithPattern = brandLocationMenuWithPatternKey({ brandLocationId });
    const foundKey = first((await redis.keys(redisKeyWithPattern)));
    const cMenu = await redis.get(foundKey);
    if (cMenu) {
      return JSON.parse(cMenu);
    }
    const brand = await this.context.brand.getByBrandLocation(brandLocationId);
    const menu = await this.context.menu.getByBrandAndCountry(
      brand.id,
      brand.countryId
    );
    const redisKey = brandLocationMenuKey({
      menuId: menu.id,
      brandLocationId,
    });
    const country = addLocalizationField(
      await this.context.country.getById(brand.countryId),
      'name'
    );
    menu.country = country.name;
    const currency = await this.context.currency.getById(country.currencyId);
    const priceRules = await this.context.brandLocationPriceRule.getByBrandLocation(
      brandLocationId
    );
    let sections = await this.context.menuSection.getByMenu(menu.id);
    sections = await Promise.all(
      sections.map(async section => {
        if (section.status == menuItemStatus.INACTIVE) return null;
        const items = await this.context.menuItem.getAllItemsWithAvailability(
          section.id,
          brandLocationId
        );
        if (items.length === 0) return null;
        section.items = await Promise.all(
          items.map(async item => {
            const optionSets = await this.context.menuItemOptionSet.getByMenuItem(
              item.id
            );
            item.optionSets = await Promise.all(
              optionSets.map(async optionSet => {
                const options = await this.context.menuItemOption.getByMenuOptionSet(
                  optionSet.id
                );
                optionSet.options = options.map(option => {
                  const priceBeforeRule = parseFloat(option.price);
                  option.price = parseFloat(option.price);
                  // Calculate Price via Price Rules ( Increase or decrease it)
                  // eslint-disable-next-line max-nested-callbacks
                  option.price = this.calculatePriceViaPriceRule(
                    priceRules,
                    option
                  );
                  option.price = new KD(
                    option.price,
                    currency.decimalPlace,
                    currency.lowestDenomination
                  )
                    .round()
                    .value.toFixed(currency.decimalPlace);
                  option.currency = addLocalizationField(
                    addLocalizationField(currency, 'symbol'),
                    'subunitName'
                  );
                  option.compareAtPrice = this.calculateCompareAtPriceViaPriceRule(
                    priceBeforeRule,
                    option
                  );
                  // If compareAtPrice exists and it is greater than 0, then display
                  if (option.compareAtPrice && option.compareAtPrice > 0) {
                    option.compareAtPrice = new KD(
                      option.compareAtPrice,
                      currency.decimalPlace,
                      currency.lowestDenomination
                    )
                      .round()
                      .value.toFixed(currency.decimalPlace);
                  }
                  // if compareAtPrice and price are equal, compareAtPrice shouldn't be display
                  if (option.compareAtPrice == option.price) {
                    option.compareAtPrice = null;
                  }
                  // option.currency.code = option.currency.symbol;
                  return addLocalizationMultipleFields(option, ['value', 'iconUrl']);
                });
                return addLocalizationField(optionSet, 'label');
              })
            );
            item.tags = await this.context.tagRelation.getTagsByRelId(item.id);
            return addLocalizationField(
              addLocalizationField(item, 'name'),
              'itemDescription'
            );
          })
        );
        return addLocalizationField(section, 'name');
      })
    );
    menu.sections = sections.filter(n => n);
    await redis.set(redisKey, JSON.stringify(menu));
    return menu;
  }

  async calculateMenuForBrand() {
    const { redis } = this.context;
    const brand = await this.context.brand.getBrand();
    const menu = await this.context.menu.getByBrandAndCountry(
      brand.id,
      brand.countryId
    );
    const redisKey = calculateBrandMenuKey(menu.id);
    const cMenu = await getCachedBrandMenu(redisKey)
    if (cMenu) {
      return cMenu;
    }
    
    const country = addLocalizationField(
      await this.context.country.getById(brand.countryId),
      'name'
    );
    menu.country = country.name;
    const currency = await this.context.currency.getById(country.currencyId);
    let sections = await this.context.menuSection.getByMenu(menu.id);
    sections = await Promise.all(
      sections.map(async section => {
        if (section.status == menuItemStatus.INACTIVE) return null;
        const items = await this.context.menuItem.getAllActiveItemsBySection(section.id);
        if (items.length === 0) return null;
        section.items = await Promise.all(
          items.map(async item => {
            /**
             * Item sold out or unavailable status are related to brand location
             * That's why we add soldOut value as false
             */
            item.soldOut = false;
            const optionSets = await this.context.menuItemOptionSet.getByMenuItem(
              item.id
            );
            item.optionSets = await Promise.all(
              optionSets.map(async optionSet => {
                const options = await this.context.menuItemOption.getByMenuOptionSet(
                  optionSet.id
                );
                optionSet.options = options.map(option => {
                  option.price = parseFloat(option.price);
                  option.price = new KD(
                    option.price,
                    currency.decimalPlace,
                    currency.lowestDenomination
                  )
                    .round()
                    .value.toFixed(currency.decimalPlace);
                  option.currency = addLocalizationField(
                    addLocalizationField(currency, 'symbol'),
                    'subunitName'
                  );
                  // If compareAtPrice exists and it is greater than 0, then display
                  if (option.compareAtPrice && option.compareAtPrice > 0) {
                    option.compareAtPrice = new KD(
                      option.compareAtPrice,
                      currency.decimalPlace,
                      currency.lowestDenomination
                    )
                      .round()
                      .value.toFixed(currency.decimalPlace);
                  }
                  // if compareAtPrice and price are equal, compareAtPrice shouldn't be display
                  if (option.compareAtPrice == option.price) {
                    option.compareAtPrice = null;
                  }
                  // option.currency.code = option.currency.symbol;
                  return addLocalizationMultipleFields(option, ['value', 'iconUrl']);
                });
                return addLocalizationField(optionSet, 'label');
              })
            );
            item.tags = await this.context.tagRelation.getTagsByRelId(item.id);
            return addLocalizationField(
              addLocalizationField(item, 'name'),
              'itemDescription'
            );
          })
        );
        return addLocalizationField(section, 'name');
      })
    );
    menu.sections = sections.filter(n => n);
    await redis.set(redisKey, JSON.stringify(menu));
    return menu;
  }

  calculatePriceViaPriceRule(priceRules, option) {
    let currentPrice = option.price;
    // Price Rules List should only contain at most one item
    priceRules.map(priceRule => {
      let priceRuleValue = 0;
      switch (priceRule.type) {
        case brandLocationPriceRuleType.FIXED: {
          priceRuleValue =
            priceRule.action === brandLocationPriceRuleAction.SUBTRACT
              ? parseFloat(priceRule.value) * -1
              : parseFloat(priceRule.value);
          currentPrice += priceRuleValue;
          break;
        }

        case brandLocationPriceRuleType.PERCENT: {
          priceRuleValue =
            priceRule.action === brandLocationPriceRuleAction.SUBTRACT
              ? (100 - parseFloat(priceRule.value)) / 100
              : (parseFloat(priceRule.value) + 100) / 100;
          currentPrice *= priceRuleValue;
          break;
        }
        default:
          priceRuleValue = 0;
      }
      currentPrice = currentPrice < 0 ? 0 : currentPrice;
      // we will just ignore the returned rule, we are interested in currentPrice
      return priceRule;
    });
    return currentPrice;
  }

  calculateCompareAtPriceViaPriceRule(priceBeforeRule, option) {
    const calculatedPrice = option.price;
    if (isNullOrUndefined(option.compareAtPrice)) {
      if (priceSlash.autoFillCompareAtPriceForUndefined) {
        return calculatedPrice < priceBeforeRule ? priceBeforeRule : null;
      }
      return null;
    }
    // if there is a compare at price of the item
    const itemCompareAtPrice = parseFloat(option.compareAtPrice);
    return calculatedPrice < itemCompareAtPrice ? itemCompareAtPrice : null;
  }

  async invalidateMenu(brandLocationId) {
    await invalidateMenuForBrandLocation.apply({ db: this.db }, [
      brandLocationId,
    ]);
    return true;
  }

  async getCurrency(brandLocationId) {
    const [currency] = await this.context.sqlCache(
      this.roDb
        .select('currencies.*')
        .from('currencies')
        .leftJoin(
          'brand_locations',
          'brand_locations.currency_id',
          'currencies.id'
        )
        .where('brand_locations.id', brandLocationId)
    );
    return currency;
  }

  async getFeesAndVat(brandLocationId) {
    const [feesAndVat] = await this.context.sqlCache(
      this.roDb
        .select(
          'countries.service_fee AS serviceFee',
          'brands.delivery_fee AS deliveryFee',
          'brands.express_delivery_fee AS expressDeliveryFee',
          'countries.vat'
        )
        .from('countries')
        .leftJoin('brands', 'brands.country_id', 'countries.id')
        .leftJoin('brand_locations', 'brand_locations.brand_id', 'brands.id')
        .where('brand_locations.id', brandLocationId)
    );
    return feesAndVat;
  }

  async getCountry(brandLocationId) {
    const [country] = await this.context.sqlCache(
      this.db
        .select('countries.*')
        .from('countries')
        .leftJoin('brands', 'brands.country_id', 'countries.id')
        .leftJoin('brand_locations', 'brand_locations.brand_id', 'brands.id')
        .where('brand_locations.id', brandLocationId)
    );
    return country;
  }

  async getAllToCSV(stream, countryId, searchTerm, filterType) {
    let query = this.roDb(this.tableName);
    query = this.getBrandLocations(query, {
      status: filterType,
      searchText: searchTerm,
    }).where('brands.country_id', countryId);

    query.select(
      'brands.name AS brandName',
      'countries.name AS countryName',
      'cities.name AS cityName',
      'neighborhoods.name AS neighborhoodName',
      'currencies.name AS currencyName'
    );
    query.join(
      'neighborhoods',
      'neighborhoods.id',
      'brand_location_addresses.neighborhood_id'
    );
    query.join('cities', 'cities.id', 'neighborhoods.city_id');
    query.join('countries', 'countries.id', 'cities.country_id');
    query.join('currencies', 'currencies.id', 'brand_locations.currency_id');

    // console.log('query', query.toString());
    return query
      .stream(s => s.pipe(new BrandLocationReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  async setBrandLocationAcceptingOrders(id, acceptingOrder, reason) {
    const brandLocation = await this.getById(id);
    if (!brandLocation) {
      return {
        errors: [setBrandLocationAcceptingOrdersError.INVALID_BRAND_LOCATION],
      };
    } else if (!acceptingOrder) {
      if (reason) {
        if (get(reason, 'length', 0) > 256) {
          return {
            errors: [setBrandLocationAcceptingOrdersError.REASON_MAX_LENGTH_EXCEEDED],
          };
        }
      } else return {
        errors: [setBrandLocationAcceptingOrdersError.REASON_MUST_BE_SET],
      };
      /*
      if (!brandLocation.acceptingOrders) return {
        errors: [setBrandLocationAcceptingOrdersError.ALREADY_NOT_ACCEPTING_ORDER],
      };
      */
    }

    await this.context.events.saveTotalClosingHours(id, Boolean(acceptingOrder));
    await this.context.brandLocationAcceptingOrders.checkAndUpdateAcceptingOrder(id, Boolean(acceptingOrder));
    await this.context.brandLocationAvailability.removeAllAvailabilityByBrandLocationId(id);

    const response = await this.db('brand_locations')
      .where({ id })
      .update('accepting_orders', Boolean(acceptingOrder));
    this.loaders.byId.clear(id);
    await this.updateBranchAvailabilityStatusInRedis(id);
    return response;
  }

  async setBrandLocationAcceptingOrdersByBrandId(brandId, acceptingOrder) {
    return this.db(this.tableName)
      .where('brand_id', brandId)
      .update('accepting_orders', Boolean(acceptingOrder));
  }

  async getBrandLocationAcceptingOrdersStatusByBrandId(brandId) {
    return this.roDb(`${this.tableName} as bl`)
      .select('accepting_orders')
      .count('*')
      .where('bl.brand_id', brandId)
      .groupBy('accepting_orders');
  }

  getByBrandId(brandId) {
    return this.db(this.tableName).where('brand_id', brandId);
  }

  // this method gets brand locations with intersect given bbox
  // bbox (boundary box) is a coordinates array [xmin, ymin, xmax, ymax]
  // https://postgis.net/docs/ST_MakeEnvelope.html
  getBrandLocationsWithBBox({
    bbox: { xmin, ymin, xmax, ymax },
    brandIds,
    filters = { status: brandLocationStatus.ACTIVE },
  }) {
    let query = this.roDb(this.tableName)
      .select(
        this.roDb.raw(`
          brand_locations.*,
          brand_location_addresses.id as brand_location_address_id,
          brand_location_addresses.short_address,
          brand_location_addresses.short_address_ar,
          brand_location_addresses.short_address_tr,
          brand_location_addresses.neighborhood_id,
          brand_location_addresses.street,
          brand_location_addresses.city,
          brand_location_addresses.city_id,
          ST_X(brand_location_addresses.geolocation) as longitude,
          ST_Y(brand_location_addresses.geolocation) as latitude`)
      )
      .rightJoin(
        'brand_location_addresses',
        'brand_location_addresses.brand_location_id',
        'brand_locations.id'
      )
      .whereRaw(
        'ST_Intersects(ST_MakeEnvelope(?, ?, ?, ?, 4326),brand_location_addresses.geolocation)',
        [xmin, ymin, xmax, ymax]
      );
    if (brandIds) {
      query = query.whereIn('brand_locations.brand_id', brandIds);
    }

    query = this.filterBrandLocations(query, filters);

    // normally this part can move to filterBrandLocations
    // but locationsInRadius query creates some conflict about that
    switch (filters.fulfillmentType) {
      case orderFulfillmentTypes.PICKUP:
        query = query.where('brand_locations.has_pickup', true);
        break;
      case orderFulfillmentTypes.DELIVERY:
        query = query.where('brand_locations.has_delivery', true);
        break;
      case orderFulfillmentTypes.CAR:
        query = query.where('brand_locations.allow_deliver_to_car', true);
        break;
      case orderFulfillmentTypes.EXPRESS_DELIVERY:
        query = query.where('brand_locations.allow_express_delivery', true);
        break;
      default:
        break;
    }
    return query;
  }

  async validateBranchContacInformation() {
    const errors = [];

    return errors;
  }

  async importBranchContacts({ fileUrl }) {
    const errors = [];
    let branches = [];
    const updateBranches = [];

    if (fileUrl) {
      const pms = new Promise(async resolve => {
        const list = await csvToJSON({ uri: fileUrl });

        if (Array.isArray(list)) {
          list.shift();

          resolve({
            list: map(list, chunk => {
              return chunk;
            }),
          });
          // }
        } else {
          resolve({
            error: importBranchContactsPayloadError.INVALID_FORMAT,
            list: [],
          });
        }
      });
      const { list: listArray, error } = await pms;
      if (error) {
        return { branches, errors: [error] };
      }
      branches = listArray;
    }

    if (branches.length > 0) {
      // 6th is the primary phone number
      // should be present
      branches = filter(branches, b => b[6]);
      if (branches && branches.length > 0) {
        // eslint-disable-next-line guard-for-in
        for (const b of branches) {
          const contacts = [
            { name: b[5], phone: b[6], ext: b[7], isPrimary: true },
          ];
          if (b[9]) {
            contacts.push({
              name: b[8],
              phone: b[9],
              ext: b[10],
              isPrimary: false,
            });
          }
          if (b[12]) {
            contacts.push({
              name: b[11],
              phone: b[12],
              ext: b[13],
              isPrimary: false,
            });
          }
          try {
            // eslint-disable-next-line no-await-in-loop
            await this.db('brand_locations')
              .update({
                contact: JSON.stringify(contacts),
              })
              .where('id', '=', b[0]);
            updateBranches.push(b[0]);
          } catch (err) {
            console.log(err.message);
          }
        }
      }
    }
    return { branches: updateBranches, errors };
  }

  async locationsInRadiusLite({
    location,
    radius,
    brandIds,
    filters,
    paging,
    countryId,
    // omitting radius in locationsInRadius query is not best way
    // we must create new query for that and separate them ASAP
    omitRadius,
  }) {
    // status = (status || brandLocationStatus.ACTIVE).trim();
    filters = filters || { status: brandLocationStatus.ACTIVE };
    radius = radius ? radius : 7000;
    // Basically creates a geohash from location and md5 hash of other params
    const targetCacheKey = calculateInRadiusKey(location, {
      radius,
      brandIds,
      filters,
      paging,
      countryId,
      omitRadius,
    });
    const { longitude, latitude } = location;
    // Checks for existing response
    const cachedResponse = await getCachedLocationsInRadius(targetCacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    let country;
    if (countryId) {
      country = await this.context.country.getById(countryId);
    }
    // if (country && filters.fulfillmentType) {
    //   switch (filters.fulfillmentType) {
    //     case orderFulfillmentTypes.PICKUP: {
    //       const {
    //         configurationValue,
    //       } = (await this.context.countryConfiguration.getByKey(
    //         countryConfigurationKeys.PICKUP_RADIUS,
    //         country.id
    //       )) || { configurationValue: 1000 };
    //       radius = configurationValue;
    //       break;
    //     }
    //     case orderFulfillmentTypes.CAR: {
    //       const {
    //         configurationValue,
    //       } = (await this.context.countryConfiguration.getByKey(
    //         countryConfigurationKeys.CAR_WINDOW_RADIUS,
    //         country.id
    //       )) || { configurationValue: 15000 };
    //       radius = configurationValue;
    //       break;
    //     }
    //     default:
    //       radius = 1000;
    //       break;
    //   }
    // }

    const query = this.roDb(this.viewName).select('*');
    query.andWhere('accepting_orders', true);
    query.andWhere('brand_location_status', brandLocationStatus.ACTIVE);
    query.andWhere('brand_status', brandLocationStatus.ACTIVE);

    if (brandIds) {
      query.whereIn('brand_id', brandIds);
    }
    let branchListFromMicroservice;
    if (omitRadius && filters.brandId) {
      branchListFromMicroservice = await this.getBranchesOfBrand(
        latitude,
        longitude,
        filters.brandId
      );
    } else {
      let countryId = null;
      if (country) {
        countryId = country.id;
      }
      branchListFromMicroservice = await this.getBranchesInRadius(
        latitude,
        longitude,
        0,
        radius,
        countryId,
        filters.fulfillmentType
      );
    }
    const branchIds = branchListFromMicroservice.map(function (item) {
      return item.branchId;
    });
    query.whereIn('id', branchIds);
    /*
       if (filters.fulfillmentType === orderFulfillmentTypes.DELIVERY) {
         query.andWhere('has_delivery', true);
       } else if (
         filters.fulfillmentType === orderFulfillmentTypes.EXPRESS_DELIVERY
       ) {
         query.andWhere('allow_express_delivery', true);
       } else if (filters.fulfillmentType === orderFulfillmentTypes.CAR) {
         query.andWhere('allow_deliver_to_car', true);
       } else if (filters.fulfillmentType === orderFulfillmentTypes.PICKUP) {
         query.andWhere('has_pickup', true);
       }
       */
    if (country) {
      query.andWhere('country_id', country.id);
    }

    if (filters.brandId) {
      query.andWhere('brand_id', filters.brandId);
    }

    let locations = await query;

    for (let i = 0; i < locations.length; i++) {
      const branchFromMicroservice = branchListFromMicroservice.find(
        o => o.branchId === locations[i].id
      );
      locations[i].latitude = branchFromMicroservice.latitude;
      locations[i].longitude = branchFromMicroservice.longitude;
      locations[i].distance = branchFromMicroservice.distance;
    }
    locations.sort((a, b) => a.distance - b.distance);
    if (paging.limit) {
      locations = locations.slice(0, paging.limit);
    }
    if (filters.distinctByBrand) {
      locations = locations.reduce((prev, curr) => {
        const index = prev.findIndex(({ brandId }) => brandId === curr.brandId);
        if (index === -1) {
          return [...prev, { ...curr, nearbyBrandLocationCount: 1 }];
        }
        prev[index].nearbyBrandLocationCount += 1;
        return prev;
      }, []);
    }
    const result = {
      brandLocations: addLocalizationField(
        addLocalizationField(locations, 'name'),
        'brandName'
      ),
    };
    if (locations.length != 0) {
      await saveCachedLocationsInRadius(targetCacheKey, result);
    }
    return result;
  }

  async ngLocationsInRadiusLite({
    location,
    radius,
    brandIds,
    paging,
    countryId,
  }) {
    paging = paging || { limit: 7 };
    radius = radius ? radius : 7000;
    const targetCacheKey = calculateInRadiusKey(location, {
      radius,
      brandIds,
      paging,
      countryId,
    });
    const { longitude, latitude } = location;
    // Checks for existing response
    const cachedResponse = await getCachedLocationsInRadius(targetCacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const query = this.roDb(this.viewName)
      .select('*')
      .andWhere('country_id', countryId)
      .andWhere('accepting_orders', true)
      .andWhere('brand_location_status', brandLocationStatus.ACTIVE)
      .andWhere('brand_status', brandLocationStatus.ACTIVE)
      .andWhere('has_pickup', true);

    if (brandIds) {
      query.whereIn('brand_id', brandIds);
    }

    const branchListFromMicroservice = await this.getBranchesInRadius(
      latitude,
      longitude,
      0,
      radius,
      countryId,
      fulfillmentType.PICKUP
    );

    const branchIds = branchListFromMicroservice.map(function (item) {
      return item.branchId;
    });
    query.whereIn('id', branchIds);

    const locations = await query;
    if (locations.length === 0) return [];
    for (let i = 0; i < locations.length; i++) {
      const branchFromMicroservice = branchListFromMicroservice.find(
        o => o.branchId === locations[i].id
      );
      locations[i].latitude = branchFromMicroservice.latitude;
      locations[i].longitude = branchFromMicroservice.longitude;
      locations[i].distance = branchFromMicroservice.distance;
    }
    locations.sort((a, b) => a.distance - b.distance);

    // console.log(locations)
    const redisAccesKeyList = [];
    for (let i = 0; i < locations.length; i++) {
      const accessKey = calculateStoreStatusFulfillmentKey(
        locations[i].id,
        orderTypes.PICKUP.toLowerCase()
      );
      redisAccesKeyList.push(accessKey);
    }
    const storeStatusDataList = await getCachedStoreStatusByMultipleKeys(
      redisAccesKeyList
    );
    let brandLocationList = [];
    const addedBrandList = [];
    for (let i = 0; i < locations.length; i++) {
      const storeStatusData = JSON.parse(storeStatusDataList[i]);
      if (
        storeStatusData &&
        (storeStatusData.storeStatus ===
          brandLocationStoreStatus.STORE_CLOSING_SOON ||
          storeStatusData.storeStatus === brandLocationStoreStatus.STORE_OPEN)
      ) {
        if (!addedBrandList.includes(locations[i].brandId)) {
          addedBrandList.push(locations[i].brandId);
          brandLocationList.push(locations[i]);
        }
      }
    }
    if (paging.limit)
      brandLocationList = brandLocationList.slice(0, paging.limit);
    const result = {
      brandLocations: addLocalizationField(
        addLocalizationField(brandLocationList, 'name'),
        'brandName'
      ),
    };
    if (brandLocationList.length != 0) {
      await saveCachedLocationsInRadius(targetCacheKey, result);
    }
    return result;
  }

  async getStoreFulfillmentStatusById(brandLocationId) {
    const fulfillmentTypes = map(Object.keys(orderTypes), e => camelCase(e));
    const resultData = {};
    for (let i = 0; i < fulfillmentTypes.length; i++) {
      const currentFulfillment = fulfillmentTypes[i];
      const accessKey = calculateStoreStatusFulfillmentKey(
        brandLocationId,
        currentFulfillment
      );
      // eslint-disable-next-line no-await-in-loop
      const cachedData = await getCachedStoreStatusByFulfillmentType(accessKey);
      if (cachedData) {
        resultData[currentFulfillment] = cachedData;
      } else {
        resultData[currentFulfillment] =
          brandLocationStoreStatus.SCHEDULING_INCONSISTENCY;
      }
    }
    return resultData;
  }

  async getNewStoreFulfillmentStatusById(brandLocationId) {
    const fulfillmentTypes = map(Object.keys(newFulfillmentTypes), e => camelCase(e));
    const resultData = {};
    for (let i = 0; i < fulfillmentTypes.length; i++) {
      const currentFulfillment = fulfillmentTypes[i];
      const accessKey = calculateBrandLocationStoreAvailabilityKey(
        brandLocationId,
        currentFulfillment
      );
      // eslint-disable-next-line no-await-in-loop
      const cachedData = await getCachedStoreStatusByFulfillmentType(accessKey);
      if (cachedData) {
        resultData[currentFulfillment] = cachedData;
      } else {
        resultData[currentFulfillment] =
          brandLocationStoreStatus.SCHEDULING_INCONSISTENCY;
      }
    }
    return resultData;
  }

  // Utility Function for Fetching Multiple Brand Locations
  async getStoreFulfillmentStatusByIdList(brandLocationIds) {
    const storeStatuses = [];
    for (let i = 0; i < brandLocationIds.length; i++) {
      const brandLocationId = brandLocationIds[i];
      storeStatuses.push(this.getStoreFulfillmentStatusById(brandLocationId));
    }
    return Promise.all(storeStatuses);
  }

  async getAvailableFulfilments(brandLocationId) {
    return this.getAllFulfillments(brandLocationId, true);
  }

  async brandsForDiscoveryCreditsByCustomerAndCountryId({
    countryId,
    customerId,
  }) {
    const discoveryCredit = await this.context.discoveryCredit.getByCustomerAndCountryId(
      customerId,
      countryId
    );
    if (discoveryCredit) {
      const queryParams = [countryId, discoveryCredit.id, countryId];
      const query = await this.roDb
        .raw(
          `
                    with "with_discovery_redemptions" as (with "with_nearby_branches" as
                    (select brand_locations.brand_id as u_brand_id
                      from "brand_locations"
                      inner join "brand_location_addresses" on "brand_location_addresses"."brand_location_id" = "brand_locations"."id"
                      inner join "brands" on "brands"."id" = "brand_locations"."brand_id"
                      where "brand_locations"."status" =  'ACTIVE'
                      and "brands"."country_id" =  ?
                      and "accepting_orders" = true group by "u_brand_id")
                    select count(discovery_credit_redemptions.id) as redemption_count, u_brand_id from "with_nearby_branches"
                    left join discovery_credit_redemptions on discovery_credit_redemptions.brand_id = with_nearby_branches.u_brand_id
                and discovery_credit_redemptions.refunded = false
                and discovery_credit_redemptions.discovery_credit_id = ?
                group by "u_brand_id")
                select brands.id,
                  brands."name" ,
                  brands."name_ar" ,
                  brands."name_tr" ,
                  brands.favicon,
                  case when redemption_count is not null then redemption_count else 0 end as redemption_availed
                from "brands" left join "with_discovery_redemptions" on "brands"."id" = "with_discovery_redemptions"."u_brand_id"
                where "brands"."status" = 'ACTIVE'
                  and "brands"."country_id" =  ?
                order by "redemption_availed" asc`,
          queryParams
        )
        .then(result => transformToCamelCase(result.rows));
      let brands = addLocalizationField(query, 'name');
      brands = map(brands, b => {
        return {
          brand: b,
          redeemedForBrand: b.redemptionAvailed,
          brandRedemptionLimit: discoveryCredit.noOfOrdersPerBrand,
        };
      });
      return brands;
    }
    return [];
  }
  async getAllPaged(countryId, filters, paging) {
    const query = this.getAll(countryId, filters);
    const response = await this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    if (response.items) {
      response.items = addLocalizationField(response.items, 'name');
    }
    return response;
  }

  getAllBranchesByIds(brandLocationIds) {
    return this.db(this.tableName)
      .whereIn('id', brandLocationIds);
  }

  getAllAvailableFulfillmentTypes(brandLocation) {
    const types = [];
    [
      brandLocation.hasDelivery ? orderFulfillmentTypes.DELIVERY : null,
      brandLocation.hasPickup ? orderFulfillmentTypes.PICKUP : null,
      brandLocation.allowExpressDelivery
        ? orderFulfillmentTypes.EXPRESS_DELIVERY
        : null,
      brandLocation.allowDeliverToCar ? orderFulfillmentTypes.CAR : null,
      // brandLocation.bringItToClass ? orderFulfillmentTypes.CLASS : null,
      // brandLocation.bringItToOffice ? orderFulfillmentTypes.OFFICE : null,
      // brandLocation.bringItToHospital ? orderFulfillmentTypes.HOSPITAL : null,
      // brandLocation.bringItToMyGate ? orderFulfillmentTypes.AIRPORT : null,
    ].map(f => (f ? types.push(f) : null));

    return types;
  }

  getIAmHereActivity(branchId) {
    return this.db(this.tableName)
      .select('i_am_here')
      .where('id', branchId)
      .first();
  }

  getWithAddress(id) {
    return this.roDb({ bl: this.tableName })
      .select(
        this.db.raw(`
          bl.*,
          bla.*,
          ST_X(bla.geolocation) as longitude,
          ST_Y(bla.geolocation) as latitude
        `)
      )
      .leftJoin(
        { bla: this.context.brandLocationAddress.tableName },
        'bl.id',
        'bla.brand_location_id'
      )
      .where('bl.id', id)
      .first();
  }

  getBranchListWithDistanceByLocation(latitude, longitude) {
    /**
     * To extend base query b for brand, bl for brand_locations, and bla for
     * brand_location_addresses must be used as aliases
     */
    return this.roDb({ bl: this.tableName })
      .select({
        branchId: 'bl.id',
        brandId: 'b.id',
        countryId: 'b.country_id',
        longitude: this.roDb.raw('ST_X(bla.geolocation)'),
        latitude: this.roDb.raw('ST_Y(bla.geolocation)'),
        acceptingOrders: this.roDb.raw('bl.accepting_orders'),
        distance: this.roDb.raw(`
          ROUND(
            (ST_DistanceSphere(
              bla.geolocation,
              ST_Makepoint(:longitude, :latitude)
            ))::numeric
          )
        `, { longitude, latitude })
      })
      .leftJoin(
        { b: this.context.brand.tableName },
        'b.id',
        'bl.brand_id'
      )
      .leftJoin(
        { bla: this.context.brandLocationAddress.tableName },
        'bl.id',
        'bla.brand_location_id'
      )
      .whereNotNull('bla.geolocation')
      .where('bl.status', brandLocationStatus.ACTIVE)
      .where('b.status', brandStatus.ACTIVE)
      .orderBy('distance', 'asc');
  }

  getBranchesInRadius(
    latitude,
    longitude,
    radiusMin = 0,
    radiusMax,
    countryId,
    fulfillment
  ) {
    const query = this.getBranchListWithDistanceByLocation(latitude, longitude);
    if (countryId) {
      query.where('b.country_id', countryId);
    }
    if (fulfillment === fulfillmentType.DELIVERY) {
      query.andWhere('bl.delivery_radius', '>', '0');
      query.andWhere(
        this.roDb.raw(`
          ROUND(
            (ST_DistanceSphere(
              bla.geolocation,
              ST_Makepoint(:longitude, :latitude)
            ))::numeric
          ) <= bl.delivery_radius*1000
        `, { longitude, latitude })
      );
    } else if (fulfillment === fulfillmentType.EXPRESS_DELIVERY) {
      query.andWhere('bl.express_delivery_radius', '>', '0');
      query.andWhere(
        this.roDb.raw(`
          ROUND(
            (ST_DistanceSphere(
              bla.geolocation,
              ST_Makepoint(:longitude, :latitude)
            ))::numeric
          ) <= bl.express_delivery_radius*1000
        `, { longitude, latitude })
      );
    } else {
      query.andWhere(
        this.roDb.raw(`
          ST_DWithin(
            bla.geolocation::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radiusMax
          )
        `, { latitude, longitude, radiusMax })
      );
    }
    return query;
  }

  getBranchesOfCountry(latitude, longitude, countryId, paging = undefined, filters = undefined) {
    const query = this.getBranchListWithDistanceByLocation(latitude, longitude);
    query.where('b.country_id', countryId);
    if (paging) query.offset(paging.offset).limit(paging.limit);
    return query;
  }

  getBranchesOfBrand(latitude, longitude, brandId) {
    const query = this.getBranchListWithDistanceByLocation(latitude, longitude);
    query.where('b.id', brandId);
    return query;
  }

  getBranchesInBoundingBox(
    userLocation,
    minLocation,
    maxLocation,
    countryId,
    fulfillment
  ) {
    const query = this.getBranchListWithDistanceByLocation(
      userLocation.latitude,
      userLocation.longitude
    );
    if (countryId) {
      query.where('b.country_id', countryId);
    }
    // with this fulfillment filters customer won't be able to see
    // branches around the map if customer is not in their delivery
    // radius. For better map experience these filters shouldn't be
    // applied. But logic was like that in the bl microservice.
    if (fulfillment === fulfillmentType.DELIVERY) {
      query.andWhere('bl.delivery_radius', '>', '0');
      query.andWhere(
        this.roDb.raw(`
          ROUND(
            (ST_DistanceSphere(
              bla.geolocation,
              ST_Makepoint(:longitude, :latitude)
            ))::numeric
          ) <= bl.delivery_radius*1000
        `, userLocation)
      );
    } else if (fulfillment === fulfillmentType.EXPRESS_DELIVERY) {
      query.andWhere('bl.express_delivery_radius', '>', '0');
      query.andWhere(
        this.roDb.raw(`
          ROUND(
            (ST_DistanceSphere(
              bla.geolocation,
              ST_Makepoint(:longitude, :latitude)
            ))::numeric
          ) <= bl.express_delivery_radius*1000
        `, userLocation)
      );
    }
    query.whereRaw(
      'ST_Intersects(ST_MakeEnvelope(?, ?, ?, ?, 4326),bla.geolocation)',
      [
        minLocation.longitude,
        minLocation.latitude,
        maxLocation.longitude,
        maxLocation.latitude
      ]
    );
    return query;
  }

  async saveNotificationForBrandLocation(customerId, brandLocationId) {
    const errors = [];
    const customer = await this.context.customer.getById(customerId);
    if (!customer.id) {
      errors.push(customerNotificationForBrandLocationOpenError.INVALID_CUSTOMER);
    }
    const brandLocation = await this.getById(
      brandLocationId
    );
    if (!brandLocation || brandLocation.status != brandLocationStatus.ACTIVE) {
      errors.push(customerNotificationForBrandLocationOpenError.INVALID_BRAND_LOCATION);
    }
    const notifications = await this.db('customer_notification_request')
      .where({ brand_location_id: brandLocationId, customer_id: customerId, status: true });
    if (notifications.length > 0) {
      errors.push(customerNotificationForBrandLocationOpenError.ALREADY_NOTIFICATION_SET);
    }
    const redisKeys = fulfillmentTypesWithKey.map(key => calculateBrandLocationStoreAvailabilityKey(brandLocationId, camelCase(key.type)));
    const fulfillmentStatuses = await getCachedStoreStatusByMultipleKeys(
      redisKeys
    );
    let storeClosed = true;
    for (let i = 0; i < fulfillmentTypesWithKey.length; i++) {
      const fulfillmentStatus = JSON.parse(
        fulfillmentStatuses[i]
      ) || {
        storeStatus: brandLocationStoreStatusFull.SCHEDULING_INCONSISTENCY
      };
      if (fulfillmentStatus.storeStatus === brandLocationStoreStatusFull.STORE_OPEN ||
        fulfillmentStatus.storeStatus === brandLocationStoreStatusFull.STORE_CLOSING_SOON) {
        storeClosed = false;
      }
    }
    if (!storeClosed) {
      errors.push(customerNotificationForBrandLocationOpenError.STORE_ALLREADY_OPEN);
    }

    if (errors.length > 0) {
      return {errors};
    }
    await this.db('customer_notification_request').insert(
      {id: uuid.get(), customer_id: customerId, brand_location_id: brandLocationId}
    );
    return {errors, status: true};
  }

  async deleteNotificationForBrandLocation(customerId, brandLocationId) {
    const errors = [];
    const customer = await this.context.customer.getById(customerId);
    if (!customer.id) {
      errors.push(customerNotificationForBrandLocationOpenError.INVALID_CUSTOMER);
    }
    const brandLocation = await this.getById(
      brandLocationId
    );
    if (!brandLocation || brandLocation.status != brandLocationStatus.ACTIVE) {
      errors.push(customerNotificationForBrandLocationOpenError.INVALID_BRAND_LOCATION);
    }
    const notifications = await this.db('customer_notification_request')
      .where({ brand_location_id: brandLocationId, customer_id: customerId, status: true });
    if (notifications.length == 0) {
      errors.push(customerNotificationForBrandLocationOpenError.ALREADY_NOTIFICATION_REMOVED);
    } else {
      await this.db('customer_notification_request')
        .update({
          status: false
        })
        .where('id', notifications[0].id);
      return {errors, status: true};
    }
    return {errors};
  }

  async getNotificationForBrandLocation(customerId, brandLocationId) {
    const errors = [];
    const customer = await this.context.customer.getById(customerId);
    if (!customer.id) {
      errors.push(customerNotificationForBrandLocationOpenError.INVALID_CUSTOMER);
    }

    if (brandLocationId) {
      const brandLocation = await this.getById(
        brandLocationId
      );
      if (!brandLocation || brandLocation.status != brandLocationStatus.ACTIVE) {
        errors.push(customerNotificationForBrandLocationOpenError.INVALID_BRAND_LOCATION);
      }
    }

    if (errors.length > 0) return {errors};
    const query = this.db('customer_notification_request')
      .where('customer_id', customerId)
      .andWhere('status', true);
    if (brandLocationId) query.andWhere('brand_location_id', brandLocationId);
    const notifications = await query;
    return {errors, status: true, notifications};

  }

  async sendCustomerNotificationForBrandLocation(brandLocationIds) {
    try {
      const customerList = await this.db('customer_notification_request')
        .where('status', true)
        .whereIn('brand_location_id', brandLocationIds);
      const select = `bl.id, bl.name as branch_name, bl.name_ar as branch_name_ar, bl.name_tr as branch_name_tr,
        b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr`;
      const brandLocationList = await this.roDb('brand_locations as bl')
        .select(this.db.raw(select))
        .leftJoin('brands AS b', 'b.id', 'bl.brand_id')
        .whereIn('bl.id', brandLocationIds);
      if (customerList.length > 0) {
        const message = contentTemplates().contents.brandLocationOpenedNotification;
        const heading = contentTemplates().headings.brandLocationOpenedNotification;
        const deeplink = contentTemplates().contents.brandLocationOpenedNotificationDeeplink;
        const pushList = [];
        customerList.map(customer => {
          const brandLocation = brandLocationList.find(brandLocation => brandLocation.id === customer.brandLocationId);
          let tempMessage = Object.assign({}, message);
          let tempHeading = Object.assign({}, heading);
          let tempDeeplink = deeplink;
          tempMessage = replacePlaceholders(tempMessage, {
            branchName: brandLocation.branchName,
            branchNameAr: brandLocation.branchNameAr ? brandLocation.branchNameAr : brandLocation.branchName,
            branchNameTr: brandLocation.branchName,
            brandName: brandLocation.brandName,
            brandNameAr: brandLocation.brandNameAr ? brandLocation.brandNameAr : brandLocation.brandName,
            brandNameTr: brandLocation.brandName,
          });
          tempHeading = replacePlaceholders(tempHeading, {
            branchName: brandLocation.branchName,
            branchNameAr: brandLocation.branchNameAr ? brandLocation.branchNameAr : brandLocation.branchName,
            branchNameTr: brandLocation.branchName,
            brandName: brandLocation.brandName,
            brandNameAr: brandLocation.brandNameAr ? brandLocation.brandNameAr : brandLocation.brandName,
            brandNameTr: brandLocation.brandName,
          });
          tempDeeplink = replacePlaceholders({deeplink}, {
            branchId: brandLocation.id
          });
          pushList.push({
            customerId: customer.customerId,
            message: tempMessage,
            heading: tempHeading,
            notificationCategory:
            notificationCategories.BRANCH,
            deeplink: tempDeeplink.deeplink,
          });
        });
        const notifications = {
          push: pushList,
          email: []
        };
        await this.context.notification.createAllIn(notifications);
        const idList = customerList.map(customer => customer.id);
        await this.db('customer_notification_request').update('status', false).whereIn('id', idList);
        return {
          status: true,
        };
      } else {
        return {
          status: true,
        };
      }
    } catch (error) {
      return {
        status: false,
        error: 'SERVICE_ERROR'
      };
    }
  }

  async updateBranchAvailabilityStatusInRedis(brandLocationId) {
    const brandLocation = await this.getById(brandLocationId);
    if (brandLocation.acceptingOrders) {
      const currentDate = moment().tz(brandLocation.timeZoneIdentifier);

      const weeklySchedules = await this.context.brandLocationWeeklySchedule.getByBrandLocationId(brandLocationId);
      const scheduleExceptions = await this.context.brandLocationScheduleException.getActiveScheduleExceptionsByBrandLocationId(brandLocationId);
      const availabities = await this.context.brandLocationAvailability.getActiveAvailabilityByBrandLocationId(brandLocationId);
      const acceptingOrders = await this.context.brandLocationAcceptingOrders.getActiveAcceptingOrder(brandLocationId);

      fulfillmentTypesWithKey.map(fulfillmentTypeWithKey => {
        let isAllDayClosed = true;
        let isBusy = false;
        let busyTime = null;
        let operatingHours = [];
        let acceptingTime = null;
        let acceptingStartTime = null;
        const currentDayOfWeek = currentDate.day();
        const previousDayOfWeek = (currentDayOfWeek + 6) % 7;
        if (weeklySchedules) {
          const currentWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == currentDayOfWeek);
          const previousWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == previousDayOfWeek);
          if (currentWeeklySchedule && currentWeeklySchedule[fulfillmentTypeWithKey.openAllDay]) {
            operatingHours.push({
              begin: currentDate.clone().startOf('day'),
              end: currentDate.clone().add(1, 'days').startOf('day')
            });
          } else if (currentWeeklySchedule) {
            const scheduleInfo = currentWeeklySchedule[fulfillmentTypeWithKey.scheduleInfo];
            if (scheduleInfo && scheduleInfo.length > 0) {
              scheduleInfo.map(schedule => {
                const startingTime = schedule.openTime.split(':');
                const openTime = currentDate.clone();
                openTime.set({
                  hour: startingTime[0],
                  minute: startingTime[1],
                  second: startingTime[2],
                  millisecond: 0,
                });
                const closeTime = openTime.clone().add(schedule.openDuration, 'm');
                if (currentDate.isBefore(closeTime)) {
                  operatingHours.push({
                    begin: openTime,
                    end: closeTime
                  });
                }
              });
            }
          }
          if (previousWeeklySchedule && !previousWeeklySchedule[fulfillmentTypeWithKey.openAllDay]) {
            const previousScheduleInfo = previousWeeklySchedule[fulfillmentTypeWithKey.scheduleInfo];
            if (previousScheduleInfo && previousScheduleInfo.length > 0) {
              previousScheduleInfo.map(schedule => {
                const startingTime = schedule.openTime.split(':');
                const openTime = currentDate.clone();
                openTime.set({
                  hour: startingTime[0],
                  minute: startingTime[1],
                  second: startingTime[2],
                  millisecond: 0,
                });
                openTime.subtract(1, 'd');
                const closeTime = openTime.clone().add(schedule.openDuration, 'm');
                if (openTime.isSameOrBefore(currentDate) && closeTime.isAfter(currentDate)) {
                  operatingHours.unshift({
                    begin: currentDate.clone().startOf('day'),
                    end: closeTime
                  });
                }
              });
            }
          }
        }
        if (scheduleExceptions) {
          const closeExceptions = filter(scheduleExceptions, scheduleException => scheduleException[fulfillmentTypeWithKey.name] && scheduleException.isClosed);
          const openExceptions = filter(scheduleExceptions, scheduleException => scheduleException[fulfillmentTypeWithKey.name] && !scheduleException.isClosed);
          if (closeExceptions.length > 0) {
            let exceptionTime = null;
            closeExceptions.map(closeException => {
              const tempExceptionTime = moment(closeException.endTime);
              if (!exceptionTime || exceptionTime.isBefore(tempExceptionTime)) exceptionTime = tempExceptionTime.clone();
            });
            const tempOperatingHours = [];
            operatingHours.map(operatingHour => {
              if (exceptionTime.isBefore(operatingHour.end)) {
                if (exceptionTime.isAfter(operatingHour.begin)) {
                  tempOperatingHours.push({
                    begin: exceptionTime,
                    end: operatingHour.closeTime
                  });
                } else {
                  tempOperatingHours.push(operatingHour);
                }
              }
            });
            operatingHours = tempOperatingHours;
          } else if (openExceptions.length > 0) {
            let exceptionEndTime = null;
            let exceptionStartTime = currentDate.clone();
            openExceptions.map(openException => {
              const tempExceptionTime = moment(openException.endTime);
              if (!exceptionEndTime || exceptionEndTime.isBefore(tempExceptionTime)) {
                exceptionEndTime = tempExceptionTime.clone();
              }
              exceptionStartTime = exceptionStartTime.isAfter(moment(openException.openTime)) ? moment(openException.openTime) : exceptionStartTime;
            });
            exceptionStartTime = exceptionStartTime.isBefore(currentDate.clone().startOf('day')) ? currentDate.clone().startOf('day') : exceptionStartTime;
            exceptionEndTime = exceptionEndTime.isAfter(currentDate.clone().add(1, 'days').startOf('day')) ? currentDate.clone().add(1, 'days').startOf('day') : exceptionEndTime;
            const tempOperatingHours = [];
            let exceptionTimeAdded = false;
            operatingHours.map(operatingHour => {
              if (currentDate.isBefore(operatingHour.end)) {
                if (exceptionEndTime.isBefore(operatingHour.begin)) {
                  if (!exceptionTimeAdded) {
                    tempOperatingHours.push({
                      begin: exceptionStartTime,
                      end: exceptionEndTime.clone(),
                    });
                  }
                  exceptionTimeAdded = true;
                  tempOperatingHours.push(operatingHour);
                } else {
                  exceptionEndTime = exceptionEndTime.isBefore(operatingHour.end) ? operatingHour.end.clone() : exceptionEndTime;
                  exceptionStartTime = operatingHour.begin.isBefore(exceptionStartTime) ? operatingHour.begin.clone() : exceptionStartTime;
                }
              }
            });
            if (!exceptionTimeAdded) tempOperatingHours.unshift({
              begin: exceptionStartTime,
              end: exceptionEndTime
            });
            operatingHours = tempOperatingHours;
          }
        }
        if (availabities && operatingHours.length > 0) {
          availabities.map(availabity => {
            if (availabity[fulfillmentTypeWithKey.name]) {
              isBusy = true;
              const tempBusyTime = moment(availabity[fulfillmentTypeWithKey.availabilityKey]);
              if (!busyTime || busyTime.isBefore(tempBusyTime)) {
                busyTime = tempBusyTime.clone();
              }
            }
          });
          if (isBusy) {
            const tempOperatingHours = [];
            operatingHours.map(operatingHour => {
              if (busyTime.isBefore(operatingHour.end)) {
                if (busyTime.isAfter(operatingHour.begin)) {
                  tempOperatingHours.push({
                    begin: busyTime,
                    end: operatingHour.closeTime
                  });
                } else {
                  tempOperatingHours.push(operatingHour);
                }
              }
            });
            operatingHours = tempOperatingHours;
          }
        }
        if (acceptingOrders) {
          acceptingOrders.map(acceptingOrderTime => {
            if (acceptingOrderTime[fulfillmentTypeWithKey.name]) {
              const tempAcceptingTime = moment(acceptingOrderTime[fulfillmentTypeWithKey.availabilityKey]);
              if (!acceptingTime || acceptingTime.isBefore(tempAcceptingTime)) {
                acceptingTime = tempAcceptingTime.clone();
                acceptingStartTime = moment(acceptingOrderTime.created);
              }
            }
          });
          if (acceptingTime) {
            const tempOperatingHours = [];
            let acceptingTimeAdded = false;
            operatingHours.map(operatingHour => {
              if (acceptingTime.isBefore(operatingHour.begin)) {
                if (!acceptingTimeAdded) {
                  tempOperatingHours.push({
                    begin: acceptingStartTime,
                    end: acceptingTime.clone(),
                  });
                  acceptingTimeAdded = true;
                }
                tempOperatingHours.push(operatingHour);
              } else {
                if (acceptingTime.isBefore(operatingHour.end)) {
                  tempOperatingHours.push({
                    begin: acceptingStartTime.isAfter(operatingHour.begin) ? operatingHour.begin : acceptingStartTime.clone(),
                    end: operatingHour.end
                  });
                  acceptingTimeAdded = true;
                }
              }
            });
            if (!acceptingTimeAdded) tempOperatingHours.unshift({
              begin: acceptingStartTime,
              end: acceptingTime.clone()
            });
            operatingHours = tempOperatingHours;
          }
        }

        isAllDayClosed = operatingHours.length == 0;
        const currentFulfilmentDetails = {
          storeStatus: brandLocationStoreStatusFull.STORE_CLOSED,
          isBusy,
          busyTime,
          isAllDayClosed,
          opening: operatingHours
        };
        operatingHours.map(operatingHour => {
          if (currentDate.isSameOrAfter(operatingHour.begin) && currentDate.isBefore(operatingHour.end)) {
            currentFulfilmentDetails.storeStatus = this.soonCheck(currentDate, operatingHour.end) ? brandLocationStoreStatusFull.STORE_CLOSING_SOON : brandLocationStoreStatusFull.STORE_OPEN;
          }
        });


        if (isAllDayClosed) {
          if (weeklySchedules) {
            const nextDayOfWeek = (currentDayOfWeek + 1) % 7;
            const {dayOfWeek, openTime} = this.findNextDayOpenTime(weeklySchedules, fulfillmentTypeWithKey, nextDayOfWeek, currentDayOfWeek, brandLocation);
            if (dayOfWeek > -1) {
              currentFulfilmentDetails.openNextWeekDay = dayOfWeek;
              currentFulfilmentDetails.openTimeNextWeekDay = openTime;
            } else currentFulfilmentDetails.allWeekClosed = true;
          } else {
            currentFulfilmentDetails.allWeekClosed = true;
          }
        } else {
          const lastOperatingTime = operatingHours.slice(-1)[0];
          if (lastOperatingTime && currentDate.isSameOrAfter(lastOperatingTime.begin) && currentDate.isBefore(lastOperatingTime.end) && moment(lastOperatingTime.end).isSameOrAfter(currentDate.clone().add(1, 'days').startOf('day'))) {
            const nextDayOfWeek = (currentDayOfWeek + 1) % 7;
            const {dayOfWeek, openTime, openDuration} = this.findNextDayOpenTime(weeklySchedules, fulfillmentTypeWithKey, nextDayOfWeek, currentDayOfWeek, brandLocation);
            if (dayOfWeek > -1) {
              const nextDayTime = currentDate.clone().add(1, 'days').startOf('day');
              const nextDayStartingTime = openTime.split(':');
              nextDayTime.set({
                hour: nextDayStartingTime[0],
                minute: nextDayStartingTime[1],
                second: nextDayStartingTime[2],
                millisecond: 0,
              });
              const nextDayCloseTime = nextDayTime.clone().add(openDuration, 'm');
              if (nextDayOfWeek == dayOfWeek && moment(lastOperatingTime.end).isSameOrAfter(nextDayTime)) {
                lastOperatingTime.end = nextDayCloseTime;
                operatingHours[operatingHours.length - 1] = lastOperatingTime;
                currentFulfilmentDetails.opening = operatingHours;
                currentFulfilmentDetails.storeStatus = brandLocationStoreStatusFull.STORE_OPEN;
              }
            }
          }
        }
        const targetKey = calculateBrandLocationStoreAvailabilityKey(brandLocation.id, fulfillmentTypeWithKey.name);
        saveBrandLocationStoreAvailability(targetKey, currentFulfilmentDetails);
      });
    } else {
      invalidateBrandLocationStoreAvailability(brandLocationId);
    }
  }

  soonCheck(currentTime, closeTime) {
    const checkTime = closeTime.clone().subtract(branchAvailability.closingSoonInMinutes, 'm');
    return checkTime.isSameOrBefore(currentTime);
  }

  findNextDayOpenTime(weeklySchedules, fulfillmentType, checkDayOfWeek, currentDayOfWeek, brandLocation) {
    if (checkDayOfWeek == currentDayOfWeek) return {dayOfWeek: -1};
    const checkWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == checkDayOfWeek);
    if (checkWeeklySchedule) {
      if (checkWeeklySchedule[fulfillmentType.openAllDay]) {
        return { openTime: '00:00:00', dayOfWeek: checkDayOfWeek, openDuration: 1440};
      } else {
        const scheduleInfo = checkWeeklySchedule[fulfillmentType.scheduleInfo];
        if (scheduleInfo && scheduleInfo.length > 0) {
          return {openTime: scheduleInfo[0].openTime, dayOfWeek: checkDayOfWeek, openDuration: scheduleInfo[0].openDuration};
        }
      }
    }
    return this.findNextDayOpenTime(weeklySchedules, fulfillmentType, (checkDayOfWeek + 1) % 7, currentDayOfWeek, brandLocation);
  }

  async getAllFulfillments(brandLocationId, onlyAvailable = false) {
    const select = `bl.id, b.id as brand_id, bl.currency_id, bl.has_delivery, bl.has_pickup, bl.allow_deliver_to_car, bl.allow_express_delivery,
    bl.name, bl.name_ar, bl.name_tr, b.name as brand_name, b.name_ar as brand_name_ar, b.name_tr as brand_name_tr,
    c.name as currency_name, c.symbol, c.symbol_ar, c.symbol_tr, c.iso_code as currency_iso_code,
    b.minimum_order_amount, b.minimum_delivery_order_amount, b.minimum_express_delivery_order_amount, b.delivery_fee, b.express_delivery_fee, b.country_id`;
    let response = await this.roDb(`${this.tableName} as bl`)
      .select(this.db.raw(select))
      .leftJoin('brands AS b', 'b.id', 'bl.brand_id')
      .leftJoin('currencies AS c', 'c.id', 'bl.currency_id')
      .where('bl.id', brandLocationId)
      .first();
    response = addLocalizationField(
      addLocalizationField(addLocalizationField(response, 'name'), 'brandName'),
      'symbol',
    );
    const fulfillmentsStatus = await this.getNewStoreFulfillmentStatusById(
      brandLocationId,
    );
    let availableFulfillments = [];
    // PICKUP
    if (
      response.hasPickup &&
      (fulfillmentsStatus.pickup.storeStatus ===
        brandLocationStoreStatusFull.STORE_CLOSING_SOON ||
        fulfillmentsStatus.pickup.storeStatus === brandLocationStoreStatusFull.STORE_OPEN)
    ) {
      availableFulfillments.push({
        countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP,
        fulfillment: orderTypes.PICKUP,
        minimumOrderAmount: response.minimumOrderAmount,
        brandLocationStoreStatus: fulfillmentsStatus.pickup.storeStatus
      });
    } else {
      if (response.hasPickup && !onlyAvailable) {
        availableFulfillments.push({
          countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_PICKUP,
          fulfillment: orderTypes.PICKUP,
          minimumOrderAmount: response.minimumOrderAmount,
          brandLocationStoreStatus: fulfillmentsStatus.pickup.isBusy
            ? brandLocationStoreStatusFull.STORE_BUSY
            : fulfillmentsStatus.pickup.storeStatus
        });
      }
    }

    // CAR
    if (
      response.allowDeliverToCar &&
      (fulfillmentsStatus.car.storeStatus === brandLocationStoreStatusFull.STORE_OPEN ||
        fulfillmentsStatus.car.storeStatus ===
        brandLocationStoreStatusFull.STORE_CLOSING_SOON)
    ) {
      availableFulfillments.push({
        countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR,
        fulfillment: orderFulfillmentTypes.CAR,
        minimumOrderAmount: response.minimumOrderAmount,
        brandLocationStoreStatus: fulfillmentsStatus.car.storeStatus
      });
    } else {
      if (response.allowDeliverToCar && !onlyAvailable) {
        availableFulfillments.push({
          countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_CAR,
          fulfillment: orderFulfillmentTypes.CAR,
          minimumOrderAmount: response.minimumOrderAmount,
          brandLocationStoreStatus: fulfillmentsStatus.car.isBusy
            ? brandLocationStoreStatusFull.STORE_BUSY
            : fulfillmentsStatus.car.storeStatus
        });
      }
    }

    // DELIVERY
    if (
      response.hasDelivery &&
      (fulfillmentsStatus.delivery.storeStatus ===
        brandLocationStoreStatusFull.STORE_CLOSING_SOON ||
        fulfillmentsStatus.delivery.storeStatus === brandLocationStoreStatusFull.STORE_OPEN)
    ) {
      availableFulfillments.push({
        countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY,
        fulfillment: orderTypes.DELIVERY,
        minimumOrderAmount: response.minimumDeliveryOrderAmount,
        deliveryFee: response.deliveryFee,
        brandLocationStoreStatus: fulfillmentsStatus.delivery.storeStatus
      });
    } else {
      if (response.hasDelivery && !onlyAvailable) {
        availableFulfillments.push({
          countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_DELIVERY,
          fulfillment: orderTypes.DELIVERY,
          minimumOrderAmount: response.minimumDeliveryOrderAmount,
          deliveryFee: response.deliveryFee,
          brandLocationStoreStatus: fulfillmentsStatus.delivery.isBusy
            ? brandLocationStoreStatusFull.STORE_BUSY
            : fulfillmentsStatus.delivery.storeStatus
        });
      }
    }

    // EXPRESS DELIVERY
    if (
      response.allowExpressDelivery &&
      (fulfillmentsStatus.expressDelivery.storeStatus ===
        brandLocationStoreStatusFull.STORE_CLOSING_SOON ||
        fulfillmentsStatus.expressDelivery.storeStatus ===
        brandLocationStoreStatusFull.STORE_OPEN)
    ) {
      availableFulfillments.push({
        countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY,
        fulfillment: orderTypes.EXPRESS_DELIVERY,
        minimumOrderAmount: response.minimumExpressDeliveryOrderAmount,
        deliveryFee: response.expressDeliveryFee,
        brandLocationStoreStatus: fulfillmentsStatus.expressDelivery.storeStatus
      });
    } else {
      if (response.allowExpressDelivery && !onlyAvailable) {
        availableFulfillments.push({
          countryCnfKey: countryConfigurationKeys.ESTIMATED_TIME_IN_MINS_EXPRESS_DELIVERY,
          fulfillment: orderTypes.EXPRESS_DELIVERY,
          minimumOrderAmount: response.minimumExpressDeliveryOrderAmount,
          deliveryFee: response.expressDeliveryFee,
          brandLocationStoreStatus: fulfillmentsStatus.expressDelivery.isBusy
            ? brandLocationStoreStatusFull.STORE_BUSY
            : fulfillmentsStatus.expressDelivery.storeStatus
        });
      }
    }

    // DB CONFIGS
    if (response
      && response.countryId
      && availableFulfillments
      && availableFulfillments.length > 0) {

      const configurations = await this.context.countryConfiguration.getByKeys(
        availableFulfillments.map(t => t.countryCnfKey),
        response.countryId,
      );
      const configurationMap = new Map(
        configurations.map(i => [i.configurationKey, i.configurationValue]),
      );

      availableFulfillments = availableFulfillments.map(t => {
        const cnfValue = configurationMap.get(t.countryCnfKey);
        if (cnfValue) {
          t.estimatedTimeInMinutes = Number(cnfValue);
        }
        delete t.countryCnfKey;
        return t;
      });
    }
    response.availableFulfillments = availableFulfillments;
    return response;
  }
}

module.exports = BrandLocation;
