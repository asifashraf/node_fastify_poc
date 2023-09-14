const BaseModel = require('../../base-model');

const { badgeSaveError, badgeStatus } = require('./enum');
const { isValidColorCode } = require('../../lib/util');

class Badge extends BaseModel {
  constructor(db, context) {
    super(db, 'badges', context);
  }

  async validateBadge(input) {
    const errors = [];
    let badge = null;
    if (input.id) {
      badge = await this.getById(input.id);
      if (!badge) errors.push(badgeSaveError.INVALID_BADGE_ID);
    }
    if (!input.text && !input.iconUrl && !input.backgroundColor) {
      errors.push(badgeSaveError.BADGE_MUST_HAVE_LEAST_ONE_ATTRIBUTE);
    } else {
      if (input.text && !input.textColor) {
        errors.push(badgeSaveError.BADGE_TEXT_COLOR_MUST_BE_REQUIRED);
      }

      if (input.textColor && !isValidColorCode(input.textColor))
        errors.push(badgeSaveError.INVALID_TEXT_COLOR_CODE);

      if (input.backgroundColor && !isValidColorCode(input.backgroundColor))
        errors.push(badgeSaveError.INVALID_BACKGROUND_COLOR_CODE);
    }
    return errors;
  }

  async getBadgesByFilters(filters) {
    const query = this.db(this.tableName);
    if (filters?.status) {
      query.where('status', filters.status);
    }
    if (filters?.badgeType) {
      query.where('type', filters.badgeType);
    }
    return await query.orderBy('created', 'desc');
  }

  async getBadgesByTypes(badgeTypes) {
    try {
      const badges = await this.db(this.tableName)
        .where('status', badgeStatus.ACTIVE)
        .whereIn('type', badgeTypes);
      return badges;
    } catch (e) {
      return [];
    }
  }

  // Badge Relations table removed
  /* async validateBadgeRelations(badgeId, relIds, isAdding) {
    const errors = [];
    const badge = await this.getById(badgeId);
    if (badge) {
      if (relIds.length > 0) {
        if (isAdding) {
          switch (badge.type) {
            case badgeTypes.SUBSCRIPTION:
              const [{count: addCount}] = await this.db('subscriptions')
                .count('*')
                .whereIn('id', relIds);
              if (addCount != relIds.length) {
                errors.push(badgeSaveError.INVALID_SUBSCRIPTION_ID);
              }
              break;
            default:
              errors.push(badgeSaveError.THE_BADGE_CANNOT_ASSOCIATE_ANY_OBJECT);
              break;
          }
        } else {
          const [{count: deleteCount}] = await this.db('badge_relations')
            .count('*')
            .where('badge_id', badgeId)
            .whereIn('rel_id', relIds);
          if (deleteCount != relIds.length) {
            errors.push(badgeSaveError.INVALID_SUBSCRIPTION_ID);
          }
        }
      } else errors.push(badgeSaveError.RELATION_ID_LIST_CANNOT_BE_EMPYT);
    } else errors.push(badgeSaveError.INVALID_BADGE_ID);
    return errors;
  }

  async addBadgeRelations(badgeId, relIds) {
    const badge = await this.getById(badgeId);
    const alreadyAddedItems = await this.db('badge_relations')
      .select('rel_id')
      .where('badge_id', badgeId)
      .whereIn('rel_id', relIds);
    let items = map(relIds, relId => {
      if (findIndex(alreadyAddedItems, item => item.relId === relId) < 0) {
        return ({ badgeId, relId, relType: badge.type });
      }
      return null;
    });
    items = items.filter(n => n);
    if (items.length > 0) await this.db('badge_relations').insert(items);
    return true;
  }

  async deleteBadgeRelations(badgeId, relIds) {
    const query = this.db('badge_relations')
      .where('badge_id', badgeId);
    if (relIds) {
      query.whereIn('rel_id', relIds);
    }
    await query.del();
    return true;
  }

  async getRelationsByBadgeId(badgeId) {
    const relations = await this.db('badge_relations')
      .where('badge_id', badgeId);
    return relations;
  }

  async getBadgesByRelId(relId, relType) {
    const badges = await this.db(this.tableName)
      .where('status', badgeStatus.ACTIVE)
      .whereRaw(
        'id in (Select badge_id from badge_relations where rel_id = :relId and rel_type = :relType group by badge_id)'
        , {relId, relType}
      );
    return badges;
  } */

}

module.exports = Badge;
