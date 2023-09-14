const {
  BrandLocationScheduleExceptionError,
} = require('./enums');
const { formatError, publishOperatingHoursChangingSubscriptionEvent } = require('../../lib/util');
const { operatingHourChangeEvent } = require('../root/enums');
const { uniq, map, first } = require('lodash');
const moment = require('moment');

module.exports = {
  Mutation: {
    async addBrandLocationScheduleException(_, {brandLocationId, exception}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let isBrandAdmin = false;
      let brandLocation = null;
      if (admin) {
        brandLocation = await context.brandLocation.getById(brandLocationId);
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            if (brandLocation) {
              isBrandAdmin = context.auth.isBrandAdmin(brandLocation.brandId);
              hasPermission = isBrandAdmin;
            } else return {error: BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION, errors: [BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const {errors: validationResult, exception: exceptionWithZone} = await context.brandLocationScheduleException.validateNewException(brandLocationId, exception);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }
        const id = await context.brandLocationScheduleException.save(brandLocationId, exceptionWithZone);
        const response = await context.brandLocationScheduleException.getById(id);
        await context.brandLocationAcceptingOrders.cleanAcceptingOrder(brandLocationId);
        await context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId);
        if (!context.auth.isVendorAdmin) {
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
            null,
            response,
            brandLocation.brandId,
            brandLocationId
          );
        } else {
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
            null,
            response,
            isBrandAdmin ? null : brandLocation.brandId,
            isBrandAdmin ? brandLocationId : null
          );
        }
        return {exceptions: [response]};
      }
      return {error: BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS, errors: [BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    /*
    async updateBrandLocationScheduleException(_, {brandLocationId, exception}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let isBrandAdmin = false;
      let brandLocation = null;
      if (admin) {
        brandLocation = await context.brandLocation.getById(brandLocationId);
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            if (brandLocation) {
              isBrandAdmin = context.auth.isBrandAdmin(brandLocation.brandId);
              hasPermission = isBrandAdmin;
            } else return {error: BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION, errors: [BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const validationResult = await context.brandLocationScheduleException.validateUpdateException(brandLocationId, exception);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }
        exception = omit(exception, ['startTime', 'endTime']);
        const id = await context.brandLocationScheduleException.save(brandLocationId, exception);
        const response = await context.brandLocationScheduleException.getById(id);
        if (!context.auth.isVendorAdmin) {
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
            null,
            response,
            brandLocation.brandId,
            brandLocationId
          );
        } else {
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
            null,
            response,
            isBrandAdmin ? null : brandLocation.brandId,
            isBrandAdmin ? brandLocationId : null
          );
        }
        return {exceptions: [response]};
      }
      return {error: BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS, errors: [BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    */
    async removeBrandLocationScheduleException(_, {brandLocationId, exceptionId}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      let isBrandAdmin = false;
      let brandLocation = null;
      if (admin) {
        brandLocation = await context.brandLocation.getById(brandLocationId);
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            if (brandLocation) {
              isBrandAdmin = context.auth.isBrandAdmin(brandLocation.brandId);
              hasPermission = isBrandAdmin;
            } else return {error: BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION, errors: [BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const validationResult = await context.brandLocationScheduleException.validateRemoveException(brandLocationId, exceptionId);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }
        const isUpdated = await context.brandLocationScheduleException.removeException(exceptionId);
        await context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId);
        if (isUpdated) {
          const exception = await context.brandLocationScheduleException.getById(exceptionId);
          if (!context.auth.isVendorAdmin) {
            await publishOperatingHoursChangingSubscriptionEvent(
              context,
              operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
              null,
              exception,
              brandLocation.brandId,
              brandLocationId
            );
          } else {
            await publishOperatingHoursChangingSubscriptionEvent(
              context,
              operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
              null,
              exception,
              isBrandAdmin ? null : brandLocation.brandId,
              isBrandAdmin ? brandLocationId : null
            );
          }
          return { isRemoved: isUpdated};
        }
        return {error: BrandLocationScheduleExceptionError.TRANSACTIONAL_ERROR, errors: [BrandLocationScheduleExceptionError.TRANSACTIONAL_ERROR]};
      }
      return {error: BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS, errors: [BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async addBulkBrandLocationScheduleException(_, {brandId, brandLocationIds, exception}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          const brand = await context.brand.getById(brandId);
          if (brand) {
            hasPermission = context.auth.isBrandAdmin(brandId);
          } else return {error: BrandLocationScheduleExceptionError.INVALID_BRAND, errors: [BrandLocationScheduleExceptionError.INVALID_BRAND]};
        } else hasPermission = true;
      }
      if (hasPermission) {
        const uniqBrandLocationIds = uniq(brandLocationIds);
        const {errors: validationResult, exception: exceptionWithZone} = await context.brandLocationScheduleException.validateNewBulkException(brandId, uniqBrandLocationIds, exception);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }

        const result = await context.withTransaction(
          'brandLocationScheduleException',
          'saveBulkExceptions',
          uniqBrandLocationIds,
          exceptionWithZone
        );
        if (!result) {
          return {error: BrandLocationScheduleExceptionError.TRANSACTIONAL_ERROR, errors: [BrandLocationScheduleExceptionError.TRANSACTIONAL_ERROR]};
        }
        map(brandLocationIds, async brandLocationId => {
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
            null,
            exception,
            null,
            brandLocationId
          );
        });


        return {isUpdated: result};
      }
      return {error: BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS, errors: [BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
  },
  Query: {
    async getBranchScheduleExceptionsByBrandLocationId(_, { brandLocationId }, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            if (brandLocation) {
              hasPermission = context.auth.isBrandAdmin(brandLocation.brandId);
            } else return {error: BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION, errors: [BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const brandLocation = await context.brandLocation.getById(brandLocationId);
        if (brandLocation) return {exceptions: await context.brandLocationScheduleException.getByBrandLocationId(brandLocationId)};
        return {error: BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION, errors: [BrandLocationScheduleExceptionError.INVALID_BRAND_LOCATION]};
      }
      return {error: BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS, errors: [BrandLocationScheduleExceptionError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
  },
  BrandLocationScheduleException: {
    async startTime({ brandLocationId, startTime }, args, context) {
      const {timeZoneIdentifier} = await context.roDb('brand_locations').select('time_zone_identifier').where('id', brandLocationId).then(first);
      return moment(startTime).tz(timeZoneIdentifier).format();
    },
    async endTime({ brandLocationId, endTime }, args, context) {
      const {timeZoneIdentifier} = await context.roDb('brand_locations').select('time_zone_identifier').where('id', brandLocationId).then(first);
      return moment(endTime).tz(timeZoneIdentifier).format();
    },
  }
};
