const BaseModel = require('../../base-model');
const { tagRelationSaveError, tagRelationType } = require('./enums');
const { formatError, addPaging, addLocalizationMultipleFields } = require('../../lib/util');
const { isArray } = require('lodash');
const { statusTypes } = require('../root/enums');
const { createLoaders } = require('./loaders');

class TagRelation extends BaseModel {
  constructor(db, context) {
    super(db, 'tag_relations', context);
    this.loaders = createLoaders(this);
  }

  getByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .join('tags', 'tag_relations.tag_id', 'tags.id')
      /*
      .joinRaw(
        `left JOIN (
          SELECT tag_id, CASE WHEN (count(*) is not null and count(*) FILTER(where end_time >= now() and start_time <= now()) = 0)
          THEN false ELSE true END as active_status
          from tag_schedules where status = 'ACTIVE' GROUP by tag_id
        ) as ts on ts.tag_id = tags.id`
      )
      .whereRaw(`(ts.active_status is null or ts.active_status = true)`)
      */
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
    let query = this.getByFilters(filters);
    query = query.joinRaw(
      `left JOIN (
        SELECT tag_id, CASE WHEN (count(*) is not null and count(*) FILTER(where end_time >= now() and start_time <= now()) = 0) 
        THEN false ELSE true END as active_status
        from tag_schedules where status = 'ACTIVE' GROUP by tag_id
      ) as ts on ts.tag_id = tags.id`
    )
      .whereRaw('(ts.active_status is null or ts.active_status = true)');
    return query;
    //return this.getByFilters(filters);
  }

  getByRelTypeAndTagIds(relType, tagIds) {
    const filters = { relType };
    let query = this.getByFilters(filters);
    query = query.joinRaw(
      `left JOIN (
        SELECT tag_id, CASE WHEN (count(*) is not null and count(*) FILTER(where end_time >= now() and start_time <= now()) = 0) 
        THEN false ELSE true END as active_status
        from tag_schedules where status = 'ACTIVE' GROUP by tag_id
      ) as ts on ts.tag_id = tags.id`
    )
      .whereRaw('(ts.active_status is null or ts.active_status = true)')
      .whereIn('tags.id', tagIds);
    return query;
    //return this.getByFilters(filters).whereIn('tags.id', tagIds);
  }

  /**
   * Tag Types is related to
   * feature/CCS-1469-extending-tag-mechanism-last-version
   */
  getByTagTypes(tagType) {
    const filters = { type: tagType };
    return this.getByFilters(filters);
  }

  async getTagsByRelId(relIds) {
    const ids = isArray(relIds) ? relIds : [relIds];
    let query = this.getByFilters();
    query = query.joinRaw(
      `left JOIN (
        SELECT tag_id, CASE WHEN (count(*) is not null and count(*) FILTER(where end_time >= now() and start_time <= now()) = 0) 
        THEN false ELSE true END as active_status
        from tag_schedules where status = 'ACTIVE' GROUP by tag_id
      ) as ts on ts.tag_id = tags.id`
    )
      .whereRaw('(ts.active_status is null or ts.active_status = true)')
      .whereIn('rel_id', ids)
      .select('tags.*');
    return addLocalizationMultipleFields(await query, ['name', 'description']);
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

  /**
   * This bulk validation is for saving process under Brand Location and Menu Item pages
   * Allowed single item and multiple tags
   * Also fallowing 3 functions are related with this process
   */
  async validateBulkForItem({ relType, relId, tagIds }) {
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
    const errors = await this.validateBulkForItem({ relType, relId, tagIds });
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

  /**
   * This bulk validation is for saving process under Tag pages
   * For now, there is only BRAND_LOCATION type
   */
  async validateAndPrepareBulkForTag(selectedBrandLocations) {
    const errors = [];
    let data = [];
    await Promise.all(
      selectedBrandLocations.map(async selectedBrandLocation => {
        if (selectedBrandLocation.selectAll) {
          const ids = await this.db(`${this.context.brandLocation.tableName}`)
            .select('id')
            .where('brand_id', selectedBrandLocation.brandId);
          if (ids.length > 0) {
            data = ids.map(id => id.id);
          } else {
            errors.push(tagRelationSaveError.BRAND_HAS_NOT_BRAND_LOCATION);
          }
        } else {
          if (selectedBrandLocation.brandLocationIds?.length > 0) {
            if (selectedBrandLocation.isExclude) {
              const ids = await this.db(`${this.context.brandLocation.tableName}`)
                .select('id')
                .where('brand_id', selectedBrandLocation.brandId)
                .whereNotIn('id', selectedBrandLocation.brandLocationIds);
              if (ids.length > 0) {
                data = ids.map(id => id.id);
              } else {
                errors.push(tagRelationSaveError.SHOULD_BE_SELECTED_A_BRAND_LOCATION);
              }
            } else {
              const ids = await this.db(`${this.context.brandLocation.tableName}`)
                .select('id')
                .where('brand_id', selectedBrandLocation.brandId)
                .whereIn('id', selectedBrandLocation.brandLocationIds);
              if (ids.length == selectedBrandLocation.brandLocationIds.length) {
                data = ids.map(id => id.id);
                console.log(data);
              } else {
                errors.push(tagRelationSaveError.SHOULD_BE_SELECTED_A_BRAND_LOCATION);
              }
            }
          } else {
            errors.push(tagRelationSaveError.INVALID_BRAND_LOCATION_LIST);
          }
        }
      })
    );
    return {errors, data};
  }

  async saveBulkforMultipleBrandLocations(branchLocations, tag) {
    await this.db(this.tableName).where('tag_id', tag.id).andWhere('rel_type', tagRelationType.BRAND_LOCATION).del();
    const tagRelationInputs = branchLocations.map(brandLocationId => {
      return {
        tagId: tag.id,
        relType: tagRelationType.BRAND_LOCATION,
        relId: brandLocationId
      };
    });
    await super.save(tagRelationInputs);
  }

  async getByRelTypeAndTagIdAndMultipleBranchLocations(relType, tagId, ids) {
    return this.db(this.tableName)
      .select('tag_relations.rel_id')
      .join('tags', 'tag_relations.tag_id', 'tags.id')
      .where('tags.id', tagId)
      .where('tag_relations.rel_type', relType)
      .whereIn('tag_relations.rel_id', ids);
  }

}

module.exports = TagRelation;
