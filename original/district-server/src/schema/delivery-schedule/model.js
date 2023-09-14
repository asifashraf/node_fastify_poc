const BaseModel = require('../../base-model');
const { map, extend, uniq } = require('lodash');
const {
  weeklyScheduleError,
  validateScheduleList,
} = require('../weekly-schedule/validation');
const { createLoaders } = require('./loaders');

class DeliverySchedule extends BaseModel {
  constructor(db, context) {
    super(db, 'delivery_schedules', context);
    this.loaders = createLoaders(this);
  }

  getByBrandLocation(brandLocationId) {
    return this.loaders.byLocation.load(brandLocationId);
  }

  async saveForBrandLocation(brandLocationId, scheduleList) {
    // Clear all the current Schedule for the Brand Location
    await this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .delete()
      .then(() => {});

    // Store the new schedule
    await this.save(
      map(scheduleList, schedule =>
        extend({}, schedule, {
          brandLocationId,
        })
      )
    );
  }

  async validate(brandLocationId, scheduleList) {
    const errors = validateScheduleList(scheduleList);
    const isValidBrandLocation = await this.context.brandLocation.isValid({
      id: brandLocationId,
    });
    if (!isValidBrandLocation) {
      errors.push(weeklyScheduleError.INVALID_BRAND_LOCATION);
    }
    return uniq(errors);
  }
}

module.exports = DeliverySchedule;
