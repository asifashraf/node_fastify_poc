const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  BrandLocationWeeklyScheduleError,
} = require('./enums');
const { find, sortBy, uniq, map, omit, isEqual } = require('lodash');
const { localTimeComponents } = require('../../lib/schedules');
const moment = require('moment');
// const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
// const {transformToCamelCase} = require('../../lib/util');

const FULFILLMENT_KEYS = [
  { type: 'PICKUP', openAllKey: 'pickupOpenAllDay', openTimeKey: 'pickupScheduleInfo', closedKey: 'pickupClosed', updatedField: 'hasPickup'},
  { type: 'CAR', openAllKey: 'carOpenAllDay', openTimeKey: 'carScheduleInfo', closedKey: 'carClosed', updatedField: 'allowDeliverToCar'},
  { type: 'DELIVERY', openAllKey: 'deliveryOpenAllDay', openTimeKey: 'deliveryScheduleInfo', closedKey: 'deliveryClosed', updatedField: 'hasDelivery'},
  { type: 'EXPRESS_DELIVERY', openAllKey: 'expressDeliveryOpenAllDay', openTimeKey: 'expressDeliveryScheduleInfo', closedKey: 'expressDeliveryClosed', updatedField: 'allowExpressDelivery'}
];

class BrandLocationWeeklySchedule extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_weekly_schedules', context);
    this.loaders = createLoaders(this);
  }

  async getByBrandLocationId(brandlocationId) {
    return await this.roDb(this.tableName)
      .select('*')
      .where('brand_location_id', brandlocationId);
  }

  async validateAndFormatted(brandLocationId, schedules, selectedFulfillments) {
    let errors = [];
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);
    if (brandLocation) {
      if (schedules.length == 0) {
        errors.push(BrandLocationWeeklyScheduleError.SCHEDULES_INFO_MISSING);
      } else if (selectedFulfillments.length == 0) {
        errors.push(BrandLocationWeeklyScheduleError.SELECTED_FULFILLMENT_MISSING);
      } else {
        schedules = schedules.map(schedule => {
          schedule.day = moment().utcOffset(0).day(schedule.day).weekday();
          return schedule;
        });
        const oldSchedules = await this.getByBrandLocationId(brandLocationId);
        const days = schedules.map(schedule => schedule.day);
        if (days.length > uniq(days).length) {
          errors.push(BrandLocationWeeklyScheduleError.DAY_NUMBER_MUST_BE_UNIQUE);
        } else {
          schedules.map(async schedule => {
            if (schedule.day < 0 || schedule.day > 6) {
              errors.push(BrandLocationWeeklyScheduleError.INVALID_DAY_NUMBER);
            } else {
              schedule.brandLocationId = brandLocationId;
              const oldSchedule = find(oldSchedules, oldSchedule => oldSchedule.day === schedule.day);
              if (oldSchedule) schedule.id = oldSchedule.id;
              FULFILLMENT_KEYS.forEach(({type, openAllKey, openTimeKey, closedKey}) => {
                if (selectedFulfillments.includes(type)) {
                  if (schedule[openAllKey]) {
                    if (schedule[closedKey]) errors.push(BrandLocationWeeklyScheduleError.OPEN_ALL_DAY_AND_CLOSED_FIELDS_CAN_NOT_BE_SAME);
                    schedule[openTimeKey] = null;
                  } else if (schedule[closedKey]) {
                    schedule[openTimeKey] = null;
                  } else if (schedule[openTimeKey] && schedule[openTimeKey].length > 0) {
                    const {intersectionErrors, openingTimes} = this.validateIntersectionTime(schedule[openTimeKey], type);
                    if (intersectionErrors.length > 0) {
                      errors = errors.concat(intersectionErrors);
                    } else schedule[openTimeKey] = JSON.stringify(openingTimes);
                  } else {
                    errors.push(BrandLocationWeeklyScheduleError['MISSING_SCHEDULE_INFO_FOR_' + type]);
                  }
                } else {
                  schedule[openAllKey] = false;
                  schedule[openTimeKey] = null;
                }
              });
              return schedule;
            }
          });
        }
      }
    } else errors.push(BrandLocationWeeklyScheduleError.INVALID_BRAND_LOCATION);
    return {errors, schedules};
  }

  async validateSchedulesForBulk(brandId, brandLocationIds, schedules) {
    let errors = [];
    // const uniqBrandLocationIds = uniq(brandLocationIds);
    const { count } = await this.db('brand_locations')
      .where('brand_id', brandId)
      .whereIn('id', brandLocationIds)
      .count()
      .first();
    if (count == brandLocationIds.length) {
      if (schedules.length == 0) {
        errors.push(BrandLocationWeeklyScheduleError.SCHEDULES_INFO_MISSING);
      } else {
        schedules = schedules.map(schedule => {
          schedule.day = moment().utcOffset(0).day(schedule.day).weekday();
          return schedule;
        });
        const days = schedules.map(schedule => schedule.day);
        if (days.length > uniq(days).length) {
          errors.push(BrandLocationWeeklyScheduleError.DAY_NUMBER_MUST_BE_UNIQUE);
        } else {
          schedules.map(async schedule => {
            if (schedule.day < 0 || schedule.day > 6) {
              errors.push(BrandLocationWeeklyScheduleError.INVALID_DAY_NUMBER);
            } else {
              FULFILLMENT_KEYS.forEach(({type, openAllKey, openTimeKey, closedKey}) => {
                if (schedule[openAllKey]) {
                  if (schedule[closedKey]) errors.push(BrandLocationWeeklyScheduleError.OPEN_ALL_DAY_AND_CLOSED_FIELDS_CAN_NOT_BE_SAME);
                  schedule[openTimeKey] = null;
                } else if (schedule[closedKey]) {
                  schedule[openTimeKey] = null;
                } else if (schedule[openTimeKey] && schedule[openTimeKey].length > 0) {
                  const {intersectionErrors, openingTimes} = this.validateIntersectionTime(schedule[openTimeKey], type);
                  if (intersectionErrors.length > 0) {
                    errors = errors.concat(intersectionErrors);
                  } else schedule[openTimeKey] = JSON.stringify(openingTimes);
                } else {
                  errors.push(BrandLocationWeeklyScheduleError['MISSING_SCHEDULE_INFO_FOR_' + type]);
                }
              });
              return schedule;
            }
          });
        }
      }
    } else errors.push(BrandLocationWeeklyScheduleError.INVALID_BRAND_LOCATION);
    return {errors, schedules};
  }

  async bulkSaveSchedule(brandLocationIds, schedules) {
    try {
      const promises = [];
      // const uniqBrandLocationIds = uniq(brandLocationIds);
      const oldSchedules = await this.roDb(this.tableName)
        .select('id', 'brand_location_id', 'day')
        .whereIn('brand_location_id', brandLocationIds);
      const brandLocations = await this.db('brand_locations')
        .whereIn('id', brandLocationIds);
      map(brandLocations, async brandLocation => {
        map(schedules, async schedule => {
          let newSchedule = schedule;
          newSchedule.brandLocationId = brandLocation.id;
          const oldSchedule = find(oldSchedules, oldSchedule => (oldSchedule.day === schedule.day && oldSchedule.brandLocationId === brandLocation.id));
          if (oldSchedule) newSchedule.id = oldSchedule.id;
          newSchedule = omit(newSchedule, ['pickupClosed', 'carClosed', 'deliveryClosed', 'expressDeliveryClosed']);
          if (!brandLocation.hasPickup) {
            newSchedule.pickupOpenAllDay = false;
            newSchedule.pickupScheduleInfo = null;
          }
          if (!brandLocation.allowDeliverToCar) {
            newSchedule.carOpenAllDay = false;
            newSchedule.carScheduleInfo = null;
          }
          if (!brandLocation.hasDelivery) {
            newSchedule.deliveryOpenAllDay = false;
            newSchedule.deliveryScheduleInfo = null;
          }
          if (!brandLocation.allowExpressDelivery) {
            newSchedule.expressDeliveryOpenAllDay = false;
            newSchedule.expressDeliveryScheduleInfo = null;
          }
          promises.push(super.save(newSchedule));
          promises.push(this.context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocation.id));
        });
      });
      await Promise.all(promises);
      return true;
    } catch (error) {
      return false;
    }
  }

  validateIntersectionTime(openingTimes, type) {
    const intersectionErrors = [];
    /**
     * Total duration can be more than 1 day(1440 m)?
     * For example opening time is 01:00 AM and closing time tomorrow 02:00 AM
     */
    //let totalDuration = 0;

    openingTimes = sortBy(openingTimes, ['openTime']);
    for (let index = 0; index < openingTimes.length; index++) {
      if (!openingTimes[index].openTime) {
        intersectionErrors.push(BrandLocationWeeklyScheduleError['MISSING_OPEN_TIME_FOR_' + type]);
      } else {
        const { hours, minutes } = localTimeComponents(openingTimes[index].openTime);
        if (
          hours === null ||
          minutes === null ||
          isNaN(hours) ||
          isNaN(minutes) ||
          hours > 23 ||
          minutes > 59
        ) {
          intersectionErrors.push(BrandLocationWeeklyScheduleError['INVALID_OPEN_TIME_FOR_' + type]);
        } else {
          if (openingTimes[index].openDuration <= 0 || openingTimes[index].openDuration >= 1440) {
            intersectionErrors.push(BrandLocationWeeklyScheduleError['INVALID_OPEN_DURATION_TIME_FOR_' + type]);
          } else {
            //totalDuration += openingTimes[index].openDuration;
            if (index > 0) {
              const previousTime = moment().utcOffset(0);
              const currentTime = moment().utcOffset(0);
              const { hours: preHours, minutes: preMinutes } = localTimeComponents(openingTimes[index - 1].openTime);
              previousTime.set({hour: preHours, minute: preMinutes, second: 0, millisecond: 0}).add(openingTimes[index - 1].openDuration, 'm');
              currentTime.set({hour: hours, minute: minutes, second: 0, millisecond: 0});
              if (previousTime.isAfter(currentTime)) {
                intersectionErrors.push(BrandLocationWeeklyScheduleError['INTERSECTION_TIME_IN_SCHEDULE_FOR_' + type]);
              }
            }
          }
        }
      }
    }
    return {intersectionErrors, openingTimes};
  }

  async save(brandLocationId, schedules, selectedFulfillments) {
    schedules = await schedules.map(schedule => {
      schedule = omit(schedule, ['pickupClosed', 'carClosed', 'deliveryClosed', 'expressDeliveryClosed']);
      return schedule;
    });
    await this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .whereNotIn('day', uniq(schedules.map(schedule => schedule.day)))
      .del();
    const result = await super.save(schedules);
    let updatedFields = {};
    FULFILLMENT_KEYS.map(({type, updatedField}) => {
      updatedFields = {...updatedFields, [updatedField]: selectedFulfillments.includes(type)};
    });
    await this.db('brand_locations')
      .update(updatedFields)
      .where('id', brandLocationId);
    return result;
  }

  async checkScheduleStatus(brandLocationId) {
    const schedules = await this.getByBrandLocationId(brandLocationId);
    let pickupClosedEveryDay = true;
    let carClosedEveryDay = true;
    let deliveryClosedEveryDay = true;
    let expressDeliveryClosedEveryDay = true;
    let sameOperatingHoursEveryDay = schedules.length > 1;
    let tempSchedule = null;
    schedules.map(schedule => {
      pickupClosedEveryDay = pickupClosedEveryDay && !schedule.pickupOpenAllDay && schedule.pickupScheduleInfo === null;
      carClosedEveryDay = carClosedEveryDay && !schedule.carOpenAllDay && schedule.carScheduleInfo === null;
      deliveryClosedEveryDay = deliveryClosedEveryDay && !schedule.deliveryOpenAllDay && schedule.deliveryScheduleInfo === null;
      expressDeliveryClosedEveryDay = expressDeliveryClosedEveryDay && !schedule.expressDeliveryOpenAllDay && schedule.expressDeliveryScheduleInfo === null;
      if (sameOperatingHoursEveryDay) {
        if (tempSchedule) {
          schedule = omit(schedule, ['id', 'day', 'created', 'updated']);
          sameOperatingHoursEveryDay = isEqual(tempSchedule, schedule);
        } else {
          tempSchedule = omit(schedule, ['id', 'day', 'created', 'updated']);
        }
      }
    });
    return {pickupClosedEveryDay, carClosedEveryDay, deliveryClosedEveryDay, expressDeliveryClosedEveryDay, sameOperatingHoursEveryDay};
  }
}

module.exports = BrandLocationWeeklySchedule;
