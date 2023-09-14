const {
  BrandLocationWeeklyScheduleError,
  WeekDays
} = require('./enums');
const { formatError, publishOperatingHoursChangingSubscriptionEvent } = require('../../lib/util');
const { operatingHourChangeEvent } = require('../root/enums');
const { uniq, map } = require('lodash');

module.exports = {
  BrandLocationWeeklySchedule: {
    day({ day}, args, context) {
      return WeekDays[day];
    },
    pickupClosed({ pickupOpenAllDay, pickupScheduleInfo}, args, context) {
      if (!pickupOpenAllDay) {
        if (!pickupScheduleInfo || pickupScheduleInfo.length === 0) return true;
      }
      return false;
    },
    carClosed({ carOpenAllDay, carScheduleInfo}, args, context) {
      if (!carOpenAllDay) {
        if (!carScheduleInfo || carScheduleInfo.length === 0) return true;
      }
      return false;
    },
    deliveryClosed({ deliveryOpenAllDay, deliveryScheduleInfo}, args, context) {
      if (!deliveryOpenAllDay) {
        if (!deliveryScheduleInfo || deliveryScheduleInfo.length === 0) return true;
      }
      return false;
    },
    expressDeliveryClosed({ expressDeliveryOpenAllDay, expressDeliveryScheduleInfo}, args, context) {
      if (!expressDeliveryOpenAllDay) {
        if (!expressDeliveryScheduleInfo || expressDeliveryScheduleInfo.length === 0) return true;
      }
      return false;
    },
  },
  Mutation: {
    async saveBrandLocationWeeklySchedule(_, {brandLocationId, schedules, selectedFulfillments}, context) {
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
            } else return {error: BrandLocationWeeklyScheduleError.INVALID_BRAND_LOCATION, errors: [BrandLocationWeeklyScheduleError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const {errors: validationResult, schedules: formattedSchedules} = await context.brandLocationWeeklySchedule.validateAndFormatted(brandLocationId, schedules, selectedFulfillments);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }
        const result = await context.withTransaction(
          'brandLocationWeeklySchedule',
          'save',
          brandLocationId,
          formattedSchedules,
          selectedFulfillments
        );
        if (result.error) return {error: BrandLocationWeeklyScheduleError.TRANSACTIONAL_ERROR, errors: [BrandLocationWeeklyScheduleError.TRANSACTIONAL_ERROR]};
        if (!context.auth.isVendorAdmin) {
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.WEEKLY_SCHEDULE_UPDATED,
            schedules,
            null,
            brandLocation.brandId,
            brandLocationId
          );
        } else {
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.WEEKLY_SCHEDULE_UPDATED,
            schedules,
            null,
            isBrandAdmin ? null : brandLocation.brandId,
            isBrandAdmin ? brandLocationId : null
          );
        }
        const response = await context.brandLocationWeeklySchedule.getByBrandLocationId(brandLocationId);
        await context.brandLocationAcceptingOrders.cleanAcceptingOrder(brandLocationId);
        const scheduleStatus = await context.brandLocationWeeklySchedule.checkScheduleStatus(brandLocationId);
        await context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId);
        return { scheduleStatus, weeklySchedule: response};
      }
      return {error: BrandLocationWeeklyScheduleError.UNAUTHORIZED_PROCESS, errors: [BrandLocationWeeklyScheduleError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async bulkSaveBrandLocationWeeklySchedule(_, {brandId, brandLocationIds, schedules}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          const brand = await context.brand.getById(brandId);
          if (brand) {
            hasPermission = context.auth.isBrandAdmin(brandId);
          } else return {error: BrandLocationWeeklyScheduleError.INVALID_BRAND, errors: [BrandLocationWeeklyScheduleError.INVALID_BRAND]};
        } else hasPermission = true;
      }
      if (hasPermission) {
        const uniqBrandLocationIds = uniq(brandLocationIds);
        const {errors: validationResult, schedules: formattedSchedules} = await context.brandLocationWeeklySchedule.validateSchedulesForBulk(brandId, uniqBrandLocationIds, schedules);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }
        const result = await context.withTransaction(
          'brandLocationWeeklySchedule',
          'bulkSaveSchedule',
          uniqBrandLocationIds,
          formattedSchedules
        );
        if (!result) return {error: BrandLocationWeeklyScheduleError.TRANSACTIONAL_ERROR, errors: [BrandLocationWeeklyScheduleError.TRANSACTIONAL_ERROR]};
        map(uniqBrandLocationIds, async brandLocationId => {
          const response = await context.brandLocationWeeklySchedule.getByBrandLocationId(brandLocationId);
          await publishOperatingHoursChangingSubscriptionEvent(
            context,
            operatingHourChangeEvent.WEEKLY_SCHEDULE_UPDATED,
            response,
            null,
            null,
            brandLocationId
          );
        });
        return {isUpdated: result};
      }
      return {error: BrandLocationWeeklyScheduleError.UNAUTHORIZED_PROCESS, errors: [BrandLocationWeeklyScheduleError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
  },
  Query: {
    async getBranchSchedulesByBrandLocationId(_, { brandLocationId }, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            if (brandLocation) {
              hasPermission = context.auth.isBrandAdmin(brandLocation.brandId);
            } else return {error: BrandLocationWeeklyScheduleError.INVALID_BRAND_LOCATION, errors: [BrandLocationWeeklyScheduleError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const scheduleStatus = await context.brandLocationWeeklySchedule.checkScheduleStatus(brandLocationId);
        const weeklySchedule = await context.brandLocationWeeklySchedule.getByBrandLocationId(brandLocationId);
        return {scheduleStatus, weeklySchedule};
      }
      return {error: BrandLocationWeeklyScheduleError.UNAUTHORIZED_PROCESS, errors: [BrandLocationWeeklyScheduleError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },

  },
};
