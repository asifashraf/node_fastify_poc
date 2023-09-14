const { map } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

module.exports = {
  Mutation: {
    async saveDriver(root, { driver }, context) {
      const errors = await context.driver.validateDriver(driver);
      if (errors.length > 0) {
        return { errors, driver: null };
      }
      const savedDriver = await context.driver.saveDriver(driver);
      return { errors: null, driver: await context.driver.getById(savedDriver) };
    },
    async saveDriverBranch(root, { input }, context) {
      const errors = await context.driver.validateDriverBranch(input);
      if (errors.length > 0) {
        return { errors, driver: null };
      }
      await context.driver.saveBranchesToDriver(input);
      return { errors: null, driver: await context.driver.getById(input.driverId) };
    },
    async deleteBranchFromDriver(root, { input }, context) {
      const errors = await context.driver.validateDeleteDriverBranch(input);
      if (errors.length > 0) {
        return { errors, deleted: false };
      }
      await context.driver.deleteBranchFromDriver(input);
      return { errors: null, deleted: true };
    },
    deleteDriver(root, args, context) {
      return context.withTransaction(
        'driver',
        'deleteDriver',
        args
      );
    },
  },
  Query: {
    async getDriver(
      root,
      { driverId },
      context
    ) {
      return context.driver.getById(driverId);
    },
    async getDrivers(
      root, { filters, paging },
      context
    ) {
      return context.driver.getQueryByFilters(filters, paging);
    },
  },
  Driver: {
    async branches({ id }, args, context) {
      const branchIds = await context.driver.getBranchesByDriverId(id);
      const branches = await Promise.all(map(branchIds, async branchId => addLocalizationField(await context.brandLocation.getById(branchId), 'name')));
      return branches;
    },
  }
};
