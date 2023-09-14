const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  BrandLocationAvailabilityError,
} = require('./enums');
const { map, find } = require('lodash');
const moment = require('moment');
// const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
// const {transformToCamelCase} = require('../../lib/util');

const OFF_UNTIL_DURATION = {
  MIN_15: 15,
  MIN_30: 30,
  MIN_60: 60,
};

class BrandLocationAvailability extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_availabilities', context);
    this.loaders = createLoaders(this);
  }

  async getByBrandLocationId(brandLocationId) {
    const query = this.roDb(this.tableName)
      .select('*')
      .where('brand_location_id', brandLocationId);
    /**
     * For vendor side we should display only active exceptions
     */
    if (this.context.auth.isVendorAdmin) query.where('status', true);
    return await query;
  }

  async validateAddAvailability(brandLocationId, availability) {
    const errors = [];
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);
    if (brandLocation) {
      if (!(availability.pickup || availability.car || availability.delivery || availability.expressDelivery))
        errors.push(BrandLocationAvailabilityError.MINIMUM_ONE_FULFILLMENT_TYPE_MUST_BE_CHOSEN);
      // Fulfillments types are ignored, they don't used anymore
      if (availability.pickup && !brandLocation.hasPickup) errors.push(BrandLocationAvailabilityError.PICKUP_FULFILLMENT_MUST_BE_ACTIVE_FOR_AVAILABILITY);
      if (availability.car && !brandLocation.allowDeliverToCar) errors.push(BrandLocationAvailabilityError.CAR_FULFILLMENT_MUST_BE_ACTIVE_FOR_AVAILABILITY);
      if (availability.delivery && !brandLocation.hasDelivery) errors.push(BrandLocationAvailabilityError.DELIVERY_FULFILLMENT_MUST_BE_ACTIVE_FOR_AVAILABILITY);
      if (availability.expressDelivery && !brandLocation.allowExpressDelivery) errors.push(BrandLocationAvailabilityError.EXPRESS_DELIVERY_FULFILLMENT_MUST_BE_ACTIVE_FOR_AVAILABILITY);

    } else errors.push(BrandLocationAvailabilityError.INVALID_BRAND_LOCATION);
    return errors;
  }

  async validateRemoveAvailability(brandLocationId, availabilityId) {
    const errors = [];
    const removedAvailability = await this.getById(availabilityId);
    if (!removedAvailability) {
      errors.push(BrandLocationAvailabilityError.CAN_NOT_FOUND_AVAILABILITY);
    } else if (removedAvailability.brandLocationId !== brandLocationId) {
      errors.push(BrandLocationAvailabilityError.BRAND_LOCATION_ID_NOT_MATCHED);
    } else if (!removedAvailability.status) errors.push(BrandLocationAvailabilityError.ALREADY_REMOVED_AVAILABILITY);
    return errors;
  }

  async validateNewBulkAvailability(brandId, brandLocationIds, availability) {
    const errors = [];
    const { count } = await this.db('brand_locations')
      .where('brand_id', brandId)
      .whereIn('id', brandLocationIds)
      .count()
      .first();
    if (count == brandLocationIds.length) {
      if (!(availability.pickup || availability.car || availability.delivery || availability.expressDelivery))
        errors.push(BrandLocationAvailabilityError.MINIMUM_ONE_FULFILLMENT_TYPE_MUST_BE_CHOSEN);
    } else errors.push(BrandLocationAvailabilityError.INVALID_BRAND_LOCATION);
    return errors;
  }

  async addAvailability(brandLocationId, availability) {
    availability.brandLocationId = brandLocationId;
    const endTime = moment();
    if (availability.busyType === 'INDEFINITELY') {
      const closeTimes = await this.findCloseTime(brandLocationId, availability);
      if (availability.pickup) {
        if (closeTimes.pickupEndTime) {
          availability.pickupEndTime = closeTimes.pickupEndTime.clone();
        } else {
          availability.pickup = false;
        }
      }
      if (availability.car) {
        if (closeTimes.carEndTime) {
          availability.carEndTime = closeTimes.carEndTime.clone();
        } else {
          availability.car = false;
        }
      } if (availability.delivery) {
        if (closeTimes.deliveryEndTime) {
          availability.deliveryEndTime = closeTimes.deliveryEndTime.clone();
        } else {
          availability.delivery = false;
        }
      } if (availability.expressDelivery) {
        if (closeTimes.expressDeliveryEndTime) {
          availability.expressDeliveryEndTime = closeTimes.expressDeliveryEndTime.clone();
        } else {
          availability.expressDelivery = false;
        }
      }
      if (!(availability.pickup || availability.car || availability.delivery || availability.expressDelivery)) {
        return { errors: [BrandLocationAvailabilityError.BRAND_LOCATION_ALREAD_CLOSED_FOR_BUSY_STATUS] };
      }
    } else {
      endTime.add(OFF_UNTIL_DURATION[availability.busyType], 'm');
      if (availability.pickup) availability.pickupEndTime = endTime.clone();
      if (availability.car) availability.carEndTime = endTime.clone();
      if (availability.delivery) availability.deliveryEndTime = endTime.clone();
      if (availability.expressDelivery) availability.expressDeliveryEndTime = endTime.clone();
    }
    return { id: await super.save(availability) };
  }

  async removeAvailability(availibilityId) {
    try {
      await this.db(this.tableName)
        .where('id', availibilityId)
        .update({ status: false });
      this._idLoader.clear(availibilityId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveBulkAvailability(brandLocationIds, availability) {
    try {
      const promises = [];
      const endTime = moment();
      const updatedBrandLocationIdsPromises = [];
      if (availability.busyType === 'INDEFINITELY') {
        await Promise.all(
          map(brandLocationIds, async brandLocationId => {
            const closeTimes = await this.findCloseTime(brandLocationId, availability);
            const tempAvailability = availability;
            if (tempAvailability.pickup) {
              if (closeTimes.pickupEndTime) {
                tempAvailability.pickupEndTime = closeTimes.pickupEndTime.clone();
              } else {
                tempAvailability.pickup = false;
              }
            }
            if (tempAvailability.car) {
              if (closeTimes.carEndTime) {
                tempAvailability.carEndTime = closeTimes.carEndTime.clone();
              } else {
                tempAvailability.car = false;
              }
            } if (tempAvailability.delivery) {
              if (closeTimes.deliveryEndTime) {
                tempAvailability.deliveryEndTime = closeTimes.deliveryEndTime.clone();
              } else {
                tempAvailability.delivery = false;
              }
            } if (tempAvailability.expressDelivery) {
              if (closeTimes.expressDeliveryEndTime) {
                tempAvailability.expressDeliveryEndTime = closeTimes.expressDeliveryEndTime.clone();
              } else {
                tempAvailability.expressDelivery = false;
              }
            }
            if (tempAvailability.pickup || tempAvailability.car || tempAvailability.delivery || tempAvailability.expressDelivery) {
              const newAvailability = { brandLocationId, ...tempAvailability };
              promises.push(super.save(newAvailability));
              updatedBrandLocationIdsPromises.push(this.context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId));
            }
          })
        );
      } else {
        endTime.add(OFF_UNTIL_DURATION[availability.busyType], 'm');
        if (availability.pickup) availability.pickupEndTime = endTime.clone();
        if (availability.car) availability.carEndTime = endTime.clone();
        if (availability.delivery) availability.deliveryEndTime = endTime.clone();
        if (availability.expressDelivery) availability.expressDeliveryEndTime = endTime.clone();
        map(brandLocationIds, async brandLocationId => {
          const newAvailability = { brandLocationId, ...availability };
          promises.push(super.save(newAvailability));
          updatedBrandLocationIdsPromises.push(this.context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId));
        });
      }
      if (promises.length > 0) {
        await Promise.all(promises);
        await Promise.all(updatedBrandLocationIdsPromises);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async getActiveAvailabilityByBrandLocationId(brandLocationId) {
    const query = this.roDb(this.tableName)
      .select('*')
      .where('status', true)
      .where('brand_location_id', brandLocationId)
      .andWhereRaw(`
        ((pickup = true and NOW() < pickup_end_time) or 
        (car = true and NOW() < car_end_time) or
        (delivery = true and NOW() < delivery_end_time) or
        (express_delivery = true and NOW() < express_delivery_end_time))
      `);
    return await query;
  }

  async removeAllAvailabilityByBrandLocationId(brandLocationId) {
    await this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .andWhere('status', true)
      .update({ status: false });
  }

  async findCloseTime(brandLocationId, availability) {
    const weeklySchedules = await this.context.brandLocationWeeklySchedule.getByBrandLocationId(brandLocationId);
    const closeTimes = {
      pickupEndTime: null,
      carEndTime: null,
      deliveryEndTime: null,
      expressDeliveryEndTime: null,
    };
    const fulfillments = [];
    if (availability.pickup) fulfillments.push({ type: 'PICKUP', openAllKey: 'pickupOpenAllDay', scheduleInfo: 'pickupScheduleInfo', endTimeKey: 'pickupEndTime' });
    if (availability.car) fulfillments.push({ type: 'CAR', openAllKey: 'carOpenAllDay', scheduleInfo: 'carScheduleInfo', endTimeKey: 'carEndTime' });
    if (availability.delivery) fulfillments.push({ type: 'DELIVERY', openAllKey: 'deliveryOpenAllDay', scheduleInfo: 'deliveryScheduleInfo', endTimeKey: 'deliveryEndTime' });
    if (availability.expressDelivery) fulfillments.push({ type: 'EXPRESS_DELIVERY', openAllKey: 'expressDeliveryOpenAllDay', scheduleInfo: 'expressDeliveryScheduleInfo', endTimeKey: 'expressDeliveryEndTime' });

    if (weeklySchedules.length > 0) {
      const brandLocation = await this.context.brandLocation.getById(brandLocationId);
      // const now = moment().tz('Etc/GMT-0', true)
      const nowTimezoned = moment().clone().tz(brandLocation.timeZoneIdentifier);
      const currentDayOfWeek = nowTimezoned.day();
      const previousDayOfWeek = (currentDayOfWeek + 6) % 7;
      const currentWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == currentDayOfWeek);
      const previousWeeklySchedule = find(weeklySchedules, weeklySchedule => weeklySchedule.day == previousDayOfWeek);
      fulfillments.map(fulfillment => {
        if (currentWeeklySchedule) {
          if (currentWeeklySchedule[fulfillment.openAllKey]) {
            closeTimes[fulfillment.endTimeKey] = nowTimezoned.clone().endOf('day');
          } else if (currentWeeklySchedule[fulfillment.scheduleInfo]) {
            const scheduleInfo = currentWeeklySchedule[fulfillment.scheduleInfo];
            if (scheduleInfo && scheduleInfo.length > 0) {
              const firstSchedule = scheduleInfo[0];
              let startingTime = firstSchedule.openTime.split(':');
              const openTime = nowTimezoned.clone();
              openTime.set({
                hour: startingTime[0],
                minute: startingTime[1],
                second: startingTime[2],
                millisecond: 0,
              });
              if (nowTimezoned.isBefore(openTime)) {
                closeTimes[fulfillment.endTimeKey] = openTime;
              } else {
                const lastSchedule = scheduleInfo[scheduleInfo.length - 1];
                startingTime = lastSchedule.openTime.split(':');
                openTime.set({
                  hour: startingTime[0],
                  minute: startingTime[1],
                  second: startingTime[2],
                  millisecond: 0,
                });
                const closeTime = openTime.clone().add(lastSchedule.openDuration, 'm');
                if (closeTime.isAfter(nowTimezoned)) {
                  closeTimes[fulfillment.endTimeKey] = closeTime;
                }
              }
            }
          }
        }
        if (closeTimes[fulfillment.endTimeKey] === null && previousWeeklySchedule && previousWeeklySchedule[fulfillment.scheduleInfo]) {
          const scheduleInfo = previousWeeklySchedule[fulfillment.scheduleInfo];
          if (scheduleInfo && scheduleInfo.length > 0) {
            const schedule = scheduleInfo[scheduleInfo.length - 1];
            const startingTime = schedule.openTime.split(':');
            const openTime = nowTimezoned.clone();
            openTime.set({
              hour: startingTime[0],
              minute: startingTime[1],
              second: startingTime[2],
              millisecond: 0,
            });
            const closeTime = openTime.clone().add(schedule.openDuration, 'm');
            if (closeTime.isAfter(nowTimezoned)) {
              closeTimes[fulfillment.endTimeKey] = closeTime;
            }
          }
        }
      });
      return closeTimes;
    } else {
      return closeTimes;
    }
  }
}

module.exports = BrandLocationAvailability;
