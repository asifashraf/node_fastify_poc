const {
  formatError,
  removeLocalizationMultipleFields,
  addLocalizationMultipleFields
} = require('../../lib/util');

module.exports = {
  Mutation: {
    async saveBadge(
      root,
      { badge },
      context
    ) {
      const validationResult = await context.badge.validateBadge(badge);
      if (validationResult.length > 0) {
        return formatError(validationResult, badge);
      }
      const badgeToSave = removeLocalizationMultipleFields(badge, ['name', 'text', 'iconUrl']);
      const id = await context.badge.save(badgeToSave);
      let savedBadge = await context.badge.getById(id);
      savedBadge = addLocalizationMultipleFields(savedBadge, ['name', 'text', 'iconUrl']);
      return { badge: savedBadge };
    },
    /* async addBadgeRelations(
      root,
      {badgeId, relIds},
      context
    ) {
      const uniqRelIds = uniq(relIds);
      const validationResult = await context.badge.validateBadgeRelations(badgeId, uniqRelIds, true);
      if (validationResult.length > 0) {
        return formatError(validationResult);
      }
      try {
        const result = await context.withTransaction(
          'badge',
          'addBadgeRelations',
          badgeId,
          uniqRelIds
        );
        return {status: result};
      } catch (error) {
        return { error: badgeSaveError.TRANSACTIONAL_ERROR, errors: [badgeSaveError.TRANSACTIONAL_ERROR]};
      }
    },
    async deleteBadgeRelations(
      root,
      {badgeId, relIds},
      context
    ) {
      const uniqRelIds = uniq(relIds);
      const validationResult = await context.badge.validateBadgeRelations(badgeId, uniqRelIds, false);
      if (validationResult.length > 0) {
        return formatError(validationResult);
      }
      try {
        const result = await context.withTransaction(
          'badge',
          'deleteBadgeRelations',
          badgeId,
          uniqRelIds
        );
        return {status: result};
      } catch (error) {
        return { error: badgeSaveError.TRANSACTIONAL_ERROR, errors: [badgeSaveError.TRANSACTIONAL_ERROR]};
      }
    },
    async deleteRelationsByBadgeId(
      root,
      {badgeId},
      context
    ) {
      const badge = await context.badge.getById(badgeId);
      if (!badge) {
        return formatError([badgeSaveError.INVALID_BADGE_ID], badge);
      }
      try {
        const result = await context.withTransaction(
          'badge',
          'deleteBadgeRelations',
          badgeId,
          null
        );
        return {status: result};
      } catch (error) {
        return { error: badgeSaveError.TRANSACTIONAL_ERROR, errors: [badgeSaveError.TRANSACTIONAL_ERROR]};
      }
    } */
  },
  Query: {
    async getBadgesByFilters(
      root,
      { filters },
      context
    ) {
      return addLocalizationMultipleFields(await context.badge.getBadgesByFilters(filters), ['name', 'text', 'iconUrl']);
    },
  },
  Badge: {
    /* async relatedObject({ id }, args, context) {
      return await context.badge.getRelationsByBadgeId(id);
    }, */
  }
};
