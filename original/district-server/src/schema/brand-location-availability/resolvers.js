const {
  BrandLocationAvailabilityError,
} = require('./enums');
const { formatError } = require('../../lib/util');
const { uniq } = require('lodash');

module.exports = {
  Mutation: {
    async addBrandLocationAvailability(_, {brandLocationId, availability}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            if (brandLocation) {
              hasPermission = context.auth.isBrandAdmin(brandLocation.brandId);
            } else return {error: BrandLocationAvailabilityError.INVALID_BRAND_LOCATION, errors: [BrandLocationAvailabilityError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const validationResult = await context.brandLocationAvailability.validateAddAvailability(brandLocationId, availability);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }
        const {errors, id} = await context.brandLocationAvailability.addAvailability(brandLocationId, availability);
        if (errors) return formatError(errors);
        await context.brandLocationAcceptingOrders.cleanAcceptingOrder(brandLocationId);
        const response = await context.brandLocationAvailability.getById(id);
        await context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId);
        return {availabilities: [response]};
      }
      return {error: BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS, errors: [BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async removeBrandLocationAvailability(_, {brandLocationId, availabilityId}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            if (brandLocation) {
              hasPermission = context.auth.isBrandAdmin(brandLocation.brandId);
            } else return {error: BrandLocationAvailabilityError.INVALID_BRAND_LOCATION, errors: [BrandLocationAvailabilityError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const validationResult = await context.brandLocationAvailability.validateRemoveAvailability(brandLocationId, availabilityId);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }
        const isUpdated = await context.brandLocationAvailability.removeAvailability(availabilityId);
        if (isUpdated) {
          const availability = await context.brandLocationAvailability.getById(availabilityId);
          await context.brandLocation.updateBranchAvailabilityStatusInRedis(brandLocationId);
          return { availabilities: [availability]};
        }
        return {error: BrandLocationAvailabilityError.TRANSACTIONAL_ERROR, errors: [BrandLocationAvailabilityError.TRANSACTIONAL_ERROR]};
      }
      return {error: BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS, errors: [BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
    async addBulkBrandLocationAvailability(_, {brandId, brandLocationIds, availability}, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          const brand = await context.brand.getById(brandId);
          if (brand) {
            hasPermission = context.auth.isBrandAdmin(brandId);
          } else return {error: BrandLocationAvailabilityError.INVALID_BRAND, errors: [BrandLocationAvailabilityError.INVALID_BRAND]};
        } else hasPermission = true;
      }
      if (hasPermission) {
        const uniqBrandLocationIds = uniq(brandLocationIds);
        const validationResult = await context.brandLocationAvailability.validateNewBulkAvailability(brandId, uniqBrandLocationIds, availability);
        if (validationResult.length > 0) {
          return formatError(validationResult);
        }

        const result = await context.withTransaction(
          'brandLocationAvailability',
          'saveBulkAvailability',
          uniqBrandLocationIds,
          availability
        );
        if (!result) {
          return {error: BrandLocationAvailabilityError.TRANSACTIONAL_ERROR, errors: [BrandLocationAvailabilityError.TRANSACTIONAL_ERROR]};
        }
        return {isUpdated: result};
      }
      return {error: BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS, errors: [BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
  },
  Query: {
    async getAvailabilityByBrandLocationId(_, { brandLocationId }, context) {
      let hasPermission = false;
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (context.auth.isVendorAdmin) {
          hasPermission = context.auth.isBranchAdmin(brandLocationId);
          if (!hasPermission) {
            const brandLocation = await context.brandLocation.getById(brandLocationId);
            if (brandLocation) {
              hasPermission = context.auth.isBrandAdmin(brandLocation.brandId);
            } else return {error: BrandLocationAvailabilityError.INVALID_BRAND_LOCATION, errors: [BrandLocationAvailabilityError.INVALID_BRAND_LOCATION]};
          }
        } else hasPermission = true;
      }
      if (hasPermission) {
        const brandLocation = await context.brandLocation.getById(brandLocationId);
        if (brandLocation) {
          return {availabilities: await context.brandLocationAvailability.getByBrandLocationId(brandLocationId)};
        }
        return {error: BrandLocationAvailabilityError.INVALID_BRAND_LOCATION, errors: [BrandLocationAvailabilityError.INVALID_BRAND_LOCATION]};
      }
      return {error: BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS, errors: [BrandLocationAvailabilityError.UNAUTHORIZED_PROCESS]}; // [attack_scope]
    },
  },
};
