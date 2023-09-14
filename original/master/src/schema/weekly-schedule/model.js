const BaseModel = require('../../base-model');
const { map, extend, uniq, forEach, find, filter, isArray } = require('lodash');
const { weeklyScheduleError, validateScheduleList } = require('./validation');
const { createLoaders } = require('./loaders');

class WeeklySchedule extends BaseModel {
  constructor(db, context) {
    super(db, 'weekly_schedules', context);
    this.loaders = createLoaders(this);
  }

  getForCofeDistrict() {
    return this.loaders.forCofe.load(1); // We don't use an ID, but dataloader requires one
  }

  getByBrandLocation(brandLocationId) {
    let ids = brandLocationId;
    if (!isArray(brandLocationId)) {
      ids = [brandLocationId];
    }

    return this.context.sqlCache(
      this.db('weekly_schedules').whereIn('brand_location_id', ids)
    );
  }

  async saveForConfiguration(scheduleList) {
    // Clear the current schedule for the config
    await this.db('cofe_district_weekly_schedule').delete();
    // Store the new schedule
    await this.save(scheduleList, 'cofe_district_weekly_schedule');
  }

  async saveForBrandLocation(brandLocationId, scheduleList) {
    if (Array.isArray(brandLocationId)) {
      const daysToUpdate = map(scheduleList, s => s.day);
      // Clear all the current Schedule for the Brand Location
      await this.db(this.tableName)
        .whereIn('brand_location_id', brandLocationId)
        .whereIn('day', daysToUpdate)
        .delete()
        .then(() => {});
      // Store the new schedule
      scheduleList = filter(scheduleList, sl => {
        return (
          (sl.openAllDay &&
            !sl.openTime &&
            !sl.openDuration) ||
          (!sl.openAllDay &&
            (
              (sl.openTime && sl.openDuration) ||
              (sl.deliveryOpenTime && sl.deliveryOpenDuration) ||
              (sl.expressDeliveryOpenTime && sl.expressDeliveryOpenDuration)
            )
          )
        );
      });
      let newScheduleList = [];
      forEach(brandLocationId, id => {
        newScheduleList = newScheduleList.concat(
          map(scheduleList, schedule =>
            extend({}, schedule, {
              brandLocationId: id,
            })
          )
        );
      });
      await this.save(newScheduleList);
      await this.context.events.saveOperatingHours({ brandLocationId });
    } else {
      // Clear all the current Schedule for the Brand Location
      await this.db(this.tableName)
        .where('brand_location_id', brandLocationId)
        .delete()
        .then(() => {});

      // Store the new schedule
      scheduleList = filter(scheduleList, sl => {
        return (
          (sl.openAllDay &&
            !sl.openTime &&
            !sl.openDuration) ||
          (!sl.openAllDay &&
            (
              (sl.openTime && sl.openDuration) ||
              (sl.deliveryOpenTime && sl.deliveryOpenDuration) ||
              (sl.expressDeliveryOpenTime && sl.expressDeliveryOpenDuration)
            )
          )
        );
      });
      await this.save(
        map(scheduleList, schedule =>
          extend({}, schedule, {
            brandLocationId,
          })
        )
      );
      await this.context.events.saveOperatingHours({ brandLocationId });
    }
  }

  async validate(brandLocationId, scheduleList) {
    const errors = validateScheduleList(scheduleList);
    let isValidBrandLocation;

    if (Array.isArray(brandLocationId)) {
      const validateBrandLocationIds = [];
      forEach(brandLocationId, id => {
        validateBrandLocationIds.push(
          this.context.brandLocation.isValid({
            id,
          })
        );
      });
      const res = await Promise.all(validateBrandLocationIds);
      isValidBrandLocation = find(res, r => !r);
      if (isValidBrandLocation === undefined) {
        isValidBrandLocation = true;
      }
    } else {
      isValidBrandLocation = await this.context.brandLocation.isValid({
        id: brandLocationId,
      });
    }

    if (!isValidBrandLocation) {
      errors.push(weeklyScheduleError.INVALID_BRAND_LOCATION);
    }
    return uniq(errors);
  }
}

module.exports = WeeklySchedule;
