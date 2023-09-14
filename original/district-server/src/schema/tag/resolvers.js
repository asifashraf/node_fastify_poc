const { omit } = require('lodash');
const { addLocalizationField, addLocalizationMultipleFields } = require('../../lib/util');
const { tagType } = require('./enums');

module.exports = {
  Tag: {
    async brandLocations({ id }, args, context, info) {
      if (info?.variableValues?.filters?.brandLocationIds) {
        return addLocalizationField(
          await context.tag.getBrandLocationsByIdsAndTagId(id, info?.variableValues?.filters?.brandLocationIds),
          'name',
        );
      } else {
        return addLocalizationField(
          await context.tagRelation.getBrandLocationsByTagId(id),
          'name',
        );
      }
    },
    async brands({ id }, args, context, info) {
      return addLocalizationMultipleFields(
        await context.tag.getBrandsByTagId(id, info?.variableValues?.filters?.brandIds),
        ['name', 'brandDescription'],
      );
    },
    async menuItems({ id }, args, context) {
      return addLocalizationField(
        await context.tagRelation.getMenuItemsByTagId(id),
        'name',
      );
    },
    async iconUrl(root, args, context) {
      const locRoot = addLocalizationField(
        root,
        'iconUrl',
      );
      return locRoot?.iconUrl;
    },
    async schedules({ id }, args, context, info) {
      if (info?.variableValues?.filters?.dateRange) {
        return context.tagSchedule.getSchedulesByDateRange(info?.variableValues?.filters?.dateRange);
      } else {
        return context.tagSchedule.getSchedulesByTagId(id);
      }
    },
    async excludedAndSelectedBrandLocations({ id }, args, context) {
      return addLocalizationField(
        await context.tag.getExcludedAndSelectedBrandLocationsByTagId(id),
        'name',
      );
    },
  },
  Query: {
    async tags(root, { filters, paging }, context) {
      return context.tag.getByFilters(filters, paging);
    },
  },
  Mutation: {
    async saveTag(root, { tag }, context) {
      const { selectedBrandLocations, isScheduled, schedules: schedulesToAdd } = tag;
      tag = omit(tag, ['schedules', 'isScheduled', 'selectedBrandLocations']);
      //let brandsWithLocationIdAndTimeZone = [];
      const {errors: tagRelationsError, data: brandLocationIds } = await context.tagRelation.validateAndPrepareBulkForTag(selectedBrandLocations);
      if (tagRelationsError.length > 0) return { tag: null, error: tagRelationsError[0], errors: tagRelationsError };
      const tagSchedulesError = await context.tagSchedule.validateTagSchedules(isScheduled, schedulesToAdd, tag.type == tagType.OFFER, tag.id);
      if (tagSchedulesError.length > 0) return { tag: null, error: tagSchedulesError[0], errors: tagSchedulesError };
      //brandsWithLocationIdAndTimeZone = await context.tag.prepareDataforBranchLocationswithTimeZones(brandLocations, brands, excludeBranches);
      //if (brandsWithLocationIdAndTimeZone.error) return { tag: null, error: brandsWithLocationIdAndTimeZone.error };
      const createdTag = await context.tag.save(tag);
      if (createdTag.error || createdTag.errors) return createdTag;
      // Add brand locations to Tag Relations
      await context.tagRelation.saveBulkforMultipleBrandLocations(brandLocationIds, createdTag.tag);
      if (isScheduled) {
        const { timeZoneIdentifier } = await context.brandLocation.getById(brandLocationIds[0]);
        await context.tagSchedule.processSchedules(schedulesToAdd, createdTag.tag, timeZoneIdentifier);
      }
      createdTag.tag.schedules = await context.tagSchedule.getSchedulesByTagId(createdTag.tag.id);
      return createdTag;
    },
  }
};
