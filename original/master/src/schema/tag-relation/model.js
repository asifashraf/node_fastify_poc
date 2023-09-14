const BaseModel = require('../../base-model');
const { tagRelationSaveError, tagRelationType } = require('./enums');
const { formatError, addPaging, addLocalizationField } = require('../../lib/util');
const { isArray } = require('lodash');
const { statusTypes } = require('../root/enums');

class TagRelation extends BaseModel {
  constructor(db, context) {
    super(db, 'tag_relations', context);
  }

  getByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .join('tags', 'tag_relations.tag_id', 'tags.id')
      .orderBy(`${this.tableName}.created`, 'desc');
    if (filters) {
      query = query.where(filters);
    }
    if (!filters?.status) {
      query = query.where('tags.status', statusTypes.ACTIVE);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

  getById(id) {
    const filters = { id };
    return this.getByFilters(filters).first();
  }

  getByTagId(tagId) {
    const filters = { tagId };
    return this.getByFilters(filters);
  }

  getByRelId(relId) {
    const filters = { relId };
    return this.getByFilters(filters);
  }

  getByTagIdAndRelId(tagId, relId) {
    const filters = { tagId, relId };
    return this.getByFilters(filters).first();
  }

  getByRelType(relType) {
    const filters = { relType };
    return this.getByFilters(filters);
  }

  getByRelTypeAndTagId(relType, tagId) {
    const filters = { relType, tagId };
    return this.getByFilters(filters);
  }

  getByRelTypeAndTagIds(relType, tagIds) {
    const filters = { relType };
    return this.getByFilters(filters).whereIn('tags.id', tagIds);
  }

  async getTagsByRelId(relIds) {
    const ids = isArray(relIds) ? relIds : [relIds];
    let query = this.getByFilters();
    query = query.whereIn('rel_id', ids);
    query = query.select('tags.*');
    return addLocalizationField(
      addLocalizationField(await query, 'name'),
      'description',
    );
  }

  getRelationObjectsByTagId(tagId, relType, joinConditionArray) {
    if (!tagId || !relType || !joinConditionArray || joinConditionArray.length !== 3)
      throw new Error('MISSING_VALUE');
    let query = this.getByFilters({ tagId });
    query.andWhere('tag_relations.rel_type', relType);
    query = query.select('tag_relations.id').join(...joinConditionArray);
    return query;
  }

  getBrandLocationsByTagId(tagId) {
    return this.db(this.context.brandLocation.tableName)
      .whereIn('id', this.getByRelTypeAndTagId(tagRelationType.BRAND_LOCATION, tagId).select('rel_id'));
  }

  getMenuItemsByTagId(tagId) {
    return this.db(this.context.menuItem.tableName)
      .whereIn('id', this.getByRelTypeAndTagId(tagRelationType.MENU_ITEM, tagId).select('rel_id'));
  }

  async validate(tagRelationInput) {
    const errors = [];
    if (!tagRelationInput) {
      errors.push(tagRelationSaveError.INVALID_INPUT);
    }

    if (!tagRelationInput.tagId) {
      errors.push(tagRelationSaveError.INVALID_INPUT);
    }

    if (!tagRelationInput.relType || !tagRelationInput.relId) {
      errors.push(tagRelationSaveError.INVALID_INPUT);
    } else {
      switch (tagRelationInput.relType) {
        case tagRelationType.BRAND_LOCATION:
          const brandLocation = await this.context.brandLocation.getById(tagRelationInput.relId);
          if (!brandLocation) {
            errors.push(tagRelationSaveError.INVALID_BRAND_LOCATION);
          }
          break;
        case tagRelationType.MENU_ITEM:
          const menuItem = await this.context.menuItem.getById(tagRelationInput.relId);
          if (!menuItem) {
            errors.push(tagRelationSaveError.INVALID_MENU_ITEM);
          }
          break;
        default:
          errors.push(tagRelationSaveError.UNEXPECTED_INPUT);
          break;
      }
    }

    if (tagRelationInput.tagId && tagRelationInput.relId) {
      const res = await this.getByTagIdAndRelId(tagRelationInput.tagId, tagRelationInput.relId);
      if (res) {
        errors.push(tagRelationSaveError.ALREADY_SAVED);
      }
    }
    return errors;
  }

  async save(tagRelationInput) {
    const errors = await this.validate(tagRelationInput);
    if (errors.length > 0) {
      return formatError(errors);
    }
    const id = await super.save(tagRelationInput);
    return {
      tagRelation: await this.getById(id),
    };
  }

  async validateBulk({ relType, relId, tagIds }) {
    const errors = [];

    if (!relType || !relId) {
      errors.push(tagRelationSaveError.INVALID_INPUT);
    } else {
      switch (relType) {
        case tagRelationType.BRAND_LOCATION:
          const brandLocation = await this.context.brandLocation.getById(relId);
          if (!brandLocation) {
            errors.push(tagRelationSaveError.INVALID_BRAND_LOCATION);
          }
          break;
        case tagRelationType.MENU_ITEM:
          const menuItem = await this.context.menuItem.getById(relId);
          if (!menuItem) {
            errors.push(tagRelationSaveError.INVALID_MENU_ITEM);
          }
          break;
        default:
          errors.push(tagRelationSaveError.UNEXPECTED_INPUT);
          break;
      }
    }

    if (tagIds && isArray(tagIds) && tagIds.length > 0) {
      const tagCount = tagIds.length;
      const [{ count }] = await this.db(this.context.tag.tableName)
        .where('status', statusTypes.ACTIVE)
        .whereIn('id', tagIds)
        .count();
      if (Number(tagCount) !== Number(count)) {
        errors.push(tagRelationSaveError.INVALID_TAG);
      }
    }

    return errors;
  }

  async saveBulkForRelation(relType, relId, tagIds) {
    const errors = await this.validateBulk({ relType, relId, tagIds });
    if (errors.length > 0) {
      return formatError(errors);
    }
    await this.db(this.tableName).where('rel_id', relId).andWhere('rel_type', relType).del();
    if (tagIds && isArray(tagIds) && tagIds.length > 0) {
      const tagRelationInputs = tagIds.map(tagId => {
        return {
          tagId,
          relId,
          relType,
        };
      });
      await super.save(tagRelationInputs);
    }
  }

  async saveBulkForBrandLocation(brandLocationId, tagIds) {
    return this.saveBulkForRelation(tagRelationType.BRAND_LOCATION, brandLocationId, tagIds);
  }

  async saveBulkForMenuItem(menuItem, tagIds) {
    return this.saveBulkForRelation(tagRelationType.MENU_ITEM, menuItem, tagIds);
  }
}

module.exports = TagRelation;
