const { first, get } = require('lodash');
const moment = require('moment');
const BaseModel = require('../../base-model');
const { brandLocationScheduleExceptionSaveError } = require('../root/enums');
const { now } = require('../../lib/util');
const { createLoaders } = require('./loaders');

class ScheduleException extends BaseModel {
  constructor(db) {
    super(db, 'schedule_exceptions');
    this.loaders = createLoaders(this);
  }

  getByBrandLocation(brandLocationId) {
    return this.db(this.tableName).where('brand_location_id', brandLocationId);
  }

  async validate(scheduleExceptions) {
    const results = await Promise.all(
      scheduleExceptions
        .filter(e => e.deleted !== true)
        .map(e => this.validateException(e))
    );

    return [].concat.apply([], results);
  }

  async validateException(scheduleException) {
    const errors = [];
    const validBrandLocation = await this.db(this.tableName).where(
      'brand_location_id',
      scheduleException.brandLocationId
    );

    if (validBrandLocation === undefined || validBrandLocation === null) {
      errors.push(
        brandLocationScheduleExceptionSaveError.INVALID_BRAND_LOCATION
      );
    }

    if (scheduleException.startTime > scheduleException.endTime) {
      errors.push(
        brandLocationScheduleExceptionSaveError.INVALID_START_END_RANGE
      );
    }

    const overlappingScheduleException = await this.db(this.tableName)
      .where('brand_location_id', scheduleException.brandLocationId)
      .andWhere('start_time', '<=', scheduleException.endTime.toISOString())
      .andWhere('end_time', '>=', scheduleException.startTime.toISOString())
      .then(first);

    if (
      overlappingScheduleException !== undefined &&
      overlappingScheduleException !== null &&
      get(overlappingScheduleException, 'id', undefined) !==
        get(scheduleException, 'id', 0)
    ) {
      errors.push(
        brandLocationScheduleExceptionSaveError.EXISTING_EXCEPTION_OVERLAP
      );
    }

    return errors;
  }

  // prettier-ignore
  getByBrandLocationIntersectingTimeRange(brandLocationId, begin, end) {
    // Look to see if this request can hit a cache of the next 30 days
    if (moment(now.get()).diff(begin, 'minutes') < 2 && moment().add('1', 'month').isSameOrAfter(end)) {
      return this.loaders.byLocation.load(brandLocationId);
    }

    const beginIso = begin.toISOString();
    const endIso = end.toISOString();
    return this.db(this.tableName)
      .where('brand_location_id', brandLocationId)
      .andWhere(function () {
        this.where(function () {
          this.where('start_time', '>=', beginIso)
            .andWhere('start_time', '<=', endIso);
        })
          .orWhere(function () {
            this.where('end_time', '>=', beginIso)
              .andWhere('end_time', '<=', endIso);
          })
          .orWhere(function () {
            this.where('start_time', '<=', beginIso)
              .andWhere('end_time', '>=', endIso);
          });
      });
  }
}

module.exports = ScheduleException;
