const redis = require('../../../redis');
const { calculateGeohashFromLatLon } = require('../../lib/geo-utils');
const { hashObject } = require('../../lib/util');
const moment = require('moment');
const {
  locationsInRadiusKey,
  brandLocationOpeningsKey,
  brandLocationStoreStatusKey,
  brandLocationStoreAvailabilityKeyByFulfillment
} = require('../../../redis/keys');
const {
  locationsInRadiusTtlInSeconds,
  brandLocationOpeningsTtlInSeconds,
  branchesForHomePageTtlInSeconds,
  branchAvailability,
} = require('../../../config');

exports.getCachedLocationsInRadius = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.saveCachedLocationsInRadius = async (targetKey, locations) => {
  return redis.set(
    targetKey,
    JSON.stringify(locations),
    'EX',
    locationsInRadiusTtlInSeconds
  );
};

exports.saveCachedLocationsInRadiusUntilNext10MinSection =
async (targetKey, locations) => {
  const totalSeconds = 600 - (moment().unix() % 600);
  if (totalSeconds > 30) {
    return redis.set(
      targetKey,
      JSON.stringify(locations),
      'EX',
      totalSeconds
    );
  }
};


exports.calculateInRadiusKey = (latLonObject, params) => {
  const geoHash = calculateGeohashFromLatLon(
    latLonObject.latitude,
    latLonObject.longitude
  );
  const paramsHash = hashObject(params);
  return locationsInRadiusKey({
    geohash: geoHash,
    params: paramsHash,
  });
};

exports.calculateOpeningsKey = (brandLocationId, params) => {
  const paramsHash = hashObject(params);
  return brandLocationOpeningsKey({
    brandLocationId,
    params: paramsHash,
  });
};

exports.getCachedOpenings = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.calculateStoreStatusFulfillmentKey = (
  brandLocationId,
  fulfillmentType
) => {
  return brandLocationStoreStatusKey({
    brandLocationId,
    fulfillment: fulfillmentType,
  });
};

/*
  This data includes two keys, but for this only storeStatus is actually used
  storeStatus : string
  openings ?:(optional available when storeStatus != STORE_CLOSED) { open : datestring , close : datestring }
 */
exports.getCachedStoreStatusByFulfillmentType = async targetKey => {
  const parsedStoreData = await redis.getByKeyAndParse(targetKey);
  // console.log('parsedStoreData : ', parsedStoreData);
  if (!parsedStoreData) {
    return parsedStoreData;
  }
  return parsedStoreData;
};

exports.calculateBrandLocationStoreAvailabilityKey = (brandLocationId, fulfillment) => {
  return brandLocationStoreAvailabilityKeyByFulfillment({ brandLocationId, fulfillment });
};

exports.saveBrandLocationStoreAvailability = async (targetKey, availability) => {
  return redis.set(
    targetKey,
    JSON.stringify(availability),
    'EX',
    branchAvailability.redisTtlSeconds
  );
};

exports.invalidateBrandLocationStoreAvailability = (brandLocationId) => {
  return redis.delKeys(`fulfillmentAvailableNew:${brandLocationId}:*`);
};

exports.getCachedStoreStatusByMultipleKeys = async targetKeys => {
  if (targetKeys.length === 0) return [];
  const parsedStoreDataList = await redis.mget(targetKeys);
  // console.log('parsedStoreDataList', parsedStoreDataList);
  return parsedStoreDataList;
};

exports.saveCachedOpenings = async (targetKey, openings) => {
  return redis.set(
    targetKey,
    JSON.stringify(openings),
    'EX',
    brandLocationOpeningsTtlInSeconds
  );
};

exports.getCachedBranchesForHomePage = async targetKey => {
  return redis.getByKeyAndParse(targetKey);
};

exports.saveCachedBranchesForHomePage = async (targetKey, locations) => {
  return redis.set(
    targetKey,
    JSON.stringify(locations),
    'EX',
    branchesForHomePageTtlInSeconds
  );
};

exports.calculateBranchesForHomePage = (latLonObject, params) => {
  const geoHash = calculateGeohashFromLatLon(
    latLonObject.latitude,
    latLonObject.longitude
  );
  const paramsHash = hashObject(params);
  return locationsInRadiusKey({
    geohash: geoHash,
    params: paramsHash,
  });
};
