const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  BrandLocationScheduleExceptionError
} = require('./enums');
const { map, first } = require('lodash');
const moment = require('moment');
// const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
// const {transformToCamelCase} = require('../../lib/util');


class BrandLocationScheduleExcepiton extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_location_schedule_exceptions', context);
    this.loaders = createLoaders(this);
  }

  async getByBrandLocationId(brandLocationId) {
    let exceptions = await this.roDb(this.tableName)
      .select('*')
      .where('brand_location_id', brandLocationId)
      .where('status', true);

    if (exceptions.length > 0) {
      const brandLocation = await this.context.brandLocation.getById(brandLocationId);
      exceptions = exceptions.map(exception => {
        if (exception.pickup && !brandLocation.hasPickup) exception.pickup = false;
        if (exception.car && !brandLocation.allowDeliverToCar) exception.car = false;
        if (exception.delivery && !brandLocation.hasDelivery) exception.delivery = false;
        if (exception.expressDelivery && !brandLocation.allowExpressDelivery) exception.expressDelivery = false;
        if (exception.pickup || exception.car || exception.delivery || exception.expressDelivery) {
          return exception;
        } else return null;
      });
      exceptions = exceptions.filter(n => n);
    }
    return exceptions;
  }

  async validateNewException(brandLocationId, exception) {
    const errors = [];
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);
    if (brandLocation) {
      if (exception.pickup && !brandLocation.hasPickup) exception.pickup = false;
      if (exception.car && !brandLocation.allowDeliverToCar) exception.car = false;
      if (exception.delivery && !brandLocation.hasDelivery) exception.delivery = false;
      if (exception.expressDelivery && !brandLocation.allowExpressDelivery) exception.expressDelivery = false;

      if (!(exception.pickup || exception.car || exception.delivery || exception.expressDelivery))
        errors.push(BrandLocationScheduleExceptionError.MINIMUM_ONE_FULFILLMENT_TYPE_MUST_BE_CHOSEN);

      const currentTime = moment();
      exception.startTime = moment(exception.startTime).tz(brandLocation.timeZoneIdentifier, true);
      exception.endTime = moment(exception.endTime).tz(brandLocation.timeZoneIdentifier, true);
      //exception.startTime = moment(exception.startTime).tz(brandLocation.timeZoneIdentifier);
      //exception.endTime = moment(exception.endTime).tz(brandLocation.timeZoneIdentifier);
      if (exception.startTime.isBefore(currentTime)) exception.startTime = currentTime;

      if (exception.startTime.isSameOrAfter(exception.endTime)) {
        errors.push(
          BrandLocationScheduleExceptionError.INVALID_START_END_RANGE
        );
      } else if (exception.endTime.isSameOrBefore(currentTime)) {
        errors.push(
          BrandLocationScheduleExceptionError.END_TIME_MUST_BE_GREATER_CURRENT_TIME
        );
      }

      const { count } = await this.db(this.tableName)
        .count('*')
        .where('brand_location_id', brandLocationId)
        .andWhere('status', true)
        .andWhere('start_time', '<=', exception.startTime)
        .andWhere('end_time', '>=', exception.endTime)
        .first();
      if (count > 0) {
        errors.push(
          BrandLocationScheduleExceptionError.EXISTING_EXCEPTION_OVERLAP
        );
      }

    } else errors.push(BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION);
    return {errors, exception};
  }

  /* async validateUpdateException(brandLocationId, exception) {
    const errors = [];
    const brandLocation = await this.context.brandLocation.getById(brandLocationId);
    if (brandLocation) {
      const updatedException = await this.getById(exception.id);
      if (!updatedException) {
        errors.push(BrandLocationScheduleExceptionError.CAN_NOT_FOUND_EXCEPTION);
      } else if (updatedException.brandLocationId !== brandLocationId) {
        errors.push(BrandLocationScheduleExceptionError.BRAND_LOCATION_ID_NOT_MATCHED);
      } else if (!updatedException.status) errors.push(BrandLocationScheduleExceptionError.ALREADY_REMOVED_EXCEPTION);

      if (!(exception.pickup || exception.car || exception.delivery || exception.expressDelivery))
        errors.push(BrandLocationScheduleExceptionError.MINIMUM_ONE_FULFILLMENT_TYPE_MUST_BE_CHOSEN);

      // We don't need this validation
      // if (exception.pickup && !brandLocation.hasPickup) errors.push(BrandLocationScheduleExceptionError.PICKUP_FULFILLMENT_MUST_BE_ACTIVE_FOR_EXCEPTION);
      // if (exception.car && !brandLocation.allowDeliverToCar) errors.push(BrandLocationScheduleExceptionError.CAR_FULFILLMENT_MUST_BE_ACTIVE_FOR_EXCEPTION);
      // if (exception.delivery && !brandLocation.hasDelivery) errors.push(BrandLocationScheduleExceptionError.DELIVERY_FULFILLMENT_MUST_BE_ACTIVE_FOR_EXCEPTION);
      // if (exception.expressDelivery && !brandLocation.allowExpressDelivery) errors.push(BrandLocationScheduleExceptionError.EXPRESS_DELIVERY_FULFILLMENT_MUST_BE_ACTIVE_FOR_EXCEPTION);


      // Update process only can change status or effected fulfillment types
      // const currentTime = moment();
      // const startTime = moment(exception.startTime).tz(brandLocation.timeZoneIdentifier, true);
      // const endTime = moment(exception.endTime).tz(brandLocation.timeZoneIdentifier, true);

      // if (startTime.isSameOrAfter(endTime)) {
      //   errors.push(
      //     BrandLocationScheduleExceptionError.INVALID_START_END_RANGE
      //   );
      // } else if (endTime.isSameOrBefore(currentTime)) {
      //   errors.push(
      //     BrandLocationScheduleExceptionError.END_TIME_MUST_BE_GREATER_CURRENT_TIME
      //   );
      // }

      // const overlappingScheduleException = await this.db(this.tableName)
      //   .where('brand_location_id', brandLocationId)
      //   .andWhere('status', true)
      //   .andWhere('start_time', '<=', startTime)
      //   .andWhere('end_time', '>=', endTime);

      // if (overlappingScheduleException.length > 1) {
      //   errors.push(
      //     BrandLocationScheduleExceptionError.EXISTING_EXCEPTION_OVERLAP
      //   );
      // }


    } else errors.push(BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION);
    return errors;
  } */

  async validateRemoveException(brandLocationId, exceptionId) {
    const errors = [];
    const removedException = await this.getById(exceptionId);
    if (!removedException) {
      errors.push(BrandLocationScheduleExceptionError.CAN_NOT_FOUND_EXCEPTION);
    } else if (removedException.brandLocationId !== brandLocationId) {
      errors.push(BrandLocationScheduleExceptionError.BRAND_LOCATION_ID_NOT_MATCHED);
    } else if (!removedException.status) errors.push(BrandLocationScheduleExceptionError.ALREADY_REMOVED_EXCEPTION);
    return errors;
  }

  async validateNewBulkException(brandId, brandLocationIds, exception) {
    const errors = [];
    const { count } = await this.db('brand_locations')
      .where('brand_id', brandId)
      .whereIn('id', brandLocationIds)
      .count()
      .first();
    if (count == brandLocationIds.length) {
      const {timeZoneIdentifier} = await this.db('brand_locations').select('time_zone_identifier').where('id', brandLocationIds[0]).then(first);
      if (!(exception.pickup || exception.car || exception.delivery || exception.expressDelivery))
        errors.push(BrandLocationScheduleExceptionError.MINIMUM_ONE_FULFILLMENT_TYPE_MUST_BE_CHOSEN);

      const currentTime = moment();
      exception.startTime = moment(exception.startTime).tz(timeZoneIdentifier, true);
      exception.endTime = moment(exception.endTime).tz(timeZoneIdentifier, true);
      if (exception.startTime.isBefore(currentTime)) exception.startTime = currentTime;
      if (exception.startTime.isSameOrAfter(exception.endTime)) {
        errors.push(
          BrandLocationScheduleExceptionError.INVALID_START_END_RANGE
        );
      } else if (exception.endTime.isSameOrBefore(currentTime)) {
        errors.push(
          BrandLocationScheduleExceptionError.END_TIME_MUST_BE_GREATER_CURRENT_TIME
        );
      }
      let query = '';
      if (exception.pickup) {
        query += ' pickup = true OR';
      }
      if (exception.car) {
        query += ' car = true OR';
      }
      if (exception.delivery) {
        query += ' delivery = true OR';
      }
      if (exception.expressDelivery) {
        query += ' express_delivery = true OR';
      }
      query = '( ' + query.slice(0, -2) + ' )';

      if (errors.length == 0) {
        const {count} = await this.db(this.tableName)
          .count('*')
          .whereIn('brand_location_id', brandLocationIds)
          .andWhere('status', true)
          .andWhereRaw(query)
          .andWhere('start_time', '<=', exception.startTime)
          .andWhere('end_time', '>=', exception.endTime)
          .first();
        if (count > 0) {
          errors.push(
            BrandLocationScheduleExceptionError.EXISTING_EXCEPTION_OVERLAP
          );
        }
      }
    } else errors.push(BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION);
    return {errors, exception};
  }

  async save(brandLocationId, exception) {
    exception.brandLocationId = brandLocationId;
    return await super.save(exception);
  }

  async removeException(exceptionId) {
    try {
      await this.db(this.tableName)
        .where('id', exceptionId)
        .update({status: false});
      this._idLoader.clear(exceptionId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveBulkExceptions(brandLocationIds, exception) {
    try {
      const promises = [];
      map(brandLocationIds, async brandLocationId => {
        const newException = { brandLocationId, ...exception};
        promises.push(super.save(newException));
        promises.push(this.context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId));
      });
      await Promise.all(promises);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getActiveScheduleExceptionsByBrandLocationId(brandLocationId) {
    const query = this.db(this.tableName)
      .select('*')
      .where('brand_location_id', brandLocationId)
      .andWhere('status', true)
      .andWhereRaw('start_time <= NOW() and NOW() < end_time')
      .orderBy('created', 'asc');

    return await query;
  }
}

module.exports = BrandLocationScheduleExcepiton;
