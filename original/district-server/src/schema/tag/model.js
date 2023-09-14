const BaseModel = require('../../base-model');
const { tagSaveError } = require('./enums');
const { tagRelationType } = require('../tag-relation/enums');
const { addPaging, formatError, addLocalizationMultipleFields, removeLocalizationMultipleFields } = require('../../lib/util');
const { omit, uniq } = require('lodash');
const { brandLocationStatus } = require('../root/enums');

class Tag extends BaseModel {
  constructor(db, context) {
    super(db, 'tags', context);
  }

  getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters?.searchText) {
      query = query.whereRaw('(LOWER(name) iLIKE LOWER(?) or LOWER(name_ar) iLIKE LOWER(?) or LOWER(name_tr) iLIKE LOWER(?))'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`]);
    }
    filters = omit(filters, [
      'searchText',
      'dateRange',
      'brandLocationIds',
      'brandIds',
      'countryId'
    ]);
    if (filters) {
      query = query.andWhere(filters);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

  getByCountryId(filters, paging) {
    let query = this.db(this.tableName)
      .select(this.roDb.raw(
        `DISTINCT tags.id,tags.name,tags.name_ar,tags.name_tr,tags.description,tags.description_ar,tags.description_tr,tags.status,
          tags.created,tags.text_color,tags.icon_url,tags.icon_url_tr,tags.icon_url_ar,tags.background_color,tags.type`
      ))
      .join({ tr: 'tag_relations' }, 'tr.tag_id', 'tags.id')
      .join({ bl: 'brand_locations' }, 'bl.id ', 'tr.rel_id')
      .join({ c: 'countries' }, 'c.currency_id', 'bl.currency_id')
      .where('tr.rel_type', tagRelationType.BRAND_LOCATION)
      .andWhere('c.id', filters.countryId)
      .orderBy('tags.created', 'desc');
    filters = omit(filters, [
      'searchText',
      'dateRange',
      'brandLocationIds',
      'brandIds'
    ]);
    filters = omit(filters, [
      'countryId'
    ]);
    const prefix = 'tags.';
    const filtersWithJoinAlias = Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [`${prefix}${k}`, v])
    );
    query = query.andWhere(filtersWithJoinAlias);
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

  async getByFilters(filters, paging) {
    if (filters?.countryId) {
      return addLocalizationMultipleFields(await this.getByCountryId(filters, paging), ['name', 'description', 'iconUrl']);
    } else {
      return addLocalizationMultipleFields(await this.getQueryByFilters(filters, paging), ['name', 'description', 'iconUrl']);
    }
  }

  async getById(id) {
    const filters = { id };
    return this.getQueryByFilters(filters).first();
  }

  getByIds(id) {
    return super.getById(id);
  }

  async validate(tagInput) {
    const errors = [];
    if (!tagInput) {
      errors.push(tagSaveError.INVALID_INPUT);
    }

    if (!tagInput.name) {
      errors.push(tagSaveError.MISSING_FIELD_NAME);
    }

    if (!tagInput.description) {
      errors.push(tagSaveError.MISSING_FIELD_DESCRIPTION);
    }

    if (!tagInput.type) {
      errors.push(tagSaveError.MISSING_FIELD_TYPE);
    }

    if (!tagInput.textColor) {
      errors.push(tagSaveError.MISSING_TEXT_COLOR);
    }

    if (!tagInput.iconUrl) {
      errors.push(tagSaveError.MISSING_ICON_URL);
    }

    if (!tagInput.backgroundColor) {
      errors.push(tagSaveError.MISSING_BACKGROUND_COLOR);
    }

    // Name check will removed and add defineCode check
    /*
    const nameCheck = async obj => {
      if (obj) {
        const filters = obj;
        const res = await this.getQueryByFilters(filters).first();
        if (res)
          errors.push(tagSaveError.NAME_ALREADY_EXIST);
      }
    };

    const { name: { en: name, ar: name_ar, tr: name_tr } } = tagInput;

    if (!tagInput.id) {
      await Promise.all([
        nameCheck(name ? { name } : null),
        nameCheck(name_ar ? { name_ar } : null),
        nameCheck(name_tr ? { name_tr } : null),
      ]);
    } else {
      const tag = await this.getQueryByFilters({id: tagInput.id}).first();
      if (tag) {
        const promiseList = [];
        if (tag.name && tag.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
          promiseList.push(nameCheck(name ? { name } : null));
        }
        if (tag.name_ar && tag.name_ar.trim().toLowerCase() !== name_ar.trim().toLowerCase()) {
          promiseList.push(nameCheck(name_ar ? { name_ar } : null));
        }
        if (tag.name_tr && tag.name_tr.trim().toLowerCase() !== name_tr.trim().toLowerCase()) {
          promiseList.push(nameCheck(name_tr ? { name_tr } : null));
        }
        if (promiseList.length > 0)
          await Promise.all(promiseList);
      }
    }
    */

    return errors;
  }

  async save(tagInput) {
    const errors = await this.validate(tagInput);
    if (errors.length > 0) {
      return formatError(errors);
    }
    tagInput = removeLocalizationMultipleFields(tagInput, ['name', 'description', 'iconUrl']);
    const id = await super.save(tagInput);
    const tagFromDb = await this.getById(id);
    const tag = addLocalizationMultipleFields(tagFromDb, ['name', 'description', 'iconUrl']);
    return {
      tag,
    };
  }

  async getBrandsByTagId(tagId, brandIds) {
    const query = this.db('brands as b')
      .select(this.roDb.raw('*'))
      .whereRaw(`b.id in (
      SELECT bl.brand_id from tags as t
      LEFT JOIN tag_relations as tr ON tr.tag_id = t.id
      LEFT JOIN brand_locations as bl ON bl.id = tr.rel_id
      where tr.rel_type = ? and t.id = ?
    )`, [tagRelationType.BRAND_LOCATION, tagId]);
    if (brandIds?.length > 0) query.whereIn('b.id', brandIds);
    return query;
  }

  async getBrandLocationsByIdsAndTagId(tagId, ids) {
    const brandLocationsWithTags = await this.context.tagRelation
      .getByRelTypeAndTagIdAndMultipleBranchLocations(tagRelationType.BRAND_LOCATION, tagId, ids);
    const query = this.db('brand_locations').select('*')
      .whereIn('id', brandLocationsWithTags.map(x => x.relId));
    return await query;
  }

  async getExcludedAndSelectedBrandLocationsByTagId(tagId) {
    const selectedBraches = addLocalizationMultipleFields(
      await this.db({ bl: this.context.brandLocation.tableName})
        .select('bl.*')
        .leftJoin({ tr: this.context.tagRelation.tableName }, 'tr.rel_id', 'bl.id')
        .where('tr.tag_id', tagId)
        .where('tr.rel_type', tagRelationType.BRAND_LOCATION)
        .where('bl.status', brandLocationStatus.ACTIVE),
      ['name']
    );

    const brandIds = uniq(selectedBraches.map(brandLocation => brandLocation.brandId));
    const selectedBrandLocationIds = selectedBraches.map(brandLocation => brandLocation.id);

    const excludedBranches = addLocalizationMultipleFields(
      await this.db({ bl: this.context.brandLocation.tableName})
        .select('bl.*')
        .whereIn('bl.brand_id', brandIds)
        .whereNotIn('bl.id', selectedBrandLocationIds)
        .where('bl.status', brandLocationStatus.ACTIVE),
      ['name']
    );
    const brands = addLocalizationMultipleFields(
      await this.context.brand.getById(brandIds),
      ['name', 'brandDescription']
    );
    const response = [];
    brandIds.map(brandId => {
      const selectedBrandLocations = selectedBraches.filter(bl => bl.brandId == brandId);
      const excludedBrandLocations = excludedBranches.filter(bl => bl.brandId == brandId);
      const tagAssignmentType = selectedBrandLocations.length > excludedBrandLocations.length ? 'BRAND' : 'BRANCH';
      const brand = brands.find(brand => brand.id == brandId);
      response.push({
        brand,
        countryId: brand.countryId,
        selectedBrandLocations,
        excludedBrandLocations,
        tagAssignmentType,
        excludeBranchesCheck: tagAssignmentType == 'BRAND',
      });
    });
    return response;
  }

  async prepareDataforBranchLocationswithTimeZones(brandLocations, brands, excludeBranches) {
    const data = [];
    if (brandLocations?.length > 0) {
      const locationsIds = await this.db(`${this.context.brandLocation.tableName}`)
        .select('id', 'time_zone_identifier')
        .whereIn('id', brandLocations);
      if (locationsIds.length > 0) {
        for (const brandLocationId of locationsIds) {
          data.push({
            brandLocationId: brandLocationId.id,
            timeZone: brandLocationId.timeZoneIdentifier
          });
        }
      }
    } else {
      if (brands?.length > 0) {
        if (excludeBranches?.length > 0) {
          for await (const brandId of brands) {
            const locationsIds = await this.db(`${this.context.brandLocation.tableName}`)
              .select('id', 'time_zone_identifier')
              .where('brand_id', brandId)
              .whereNotIn('id', excludeBranches);
            if (locationsIds.length > 0) {
              for (const brandLocationId of locationsIds) {
                data.push({
                  brandLocationId: brandLocationId.id,
                  timeZone: brandLocationId.timeZoneIdentifier
                });
              }
            }
          }
        } else {
          for await (const brandId of brands) {
            const locationsIds = await this.db(`${this.context.brandLocation.tableName}`)
              .select('id', 'time_zone_identifier')
              .where('brand_id', brandId);
            if (locationsIds.length > 0) {
              for (const brandLocationId of locationsIds) {
                data.push({
                  brandId,
                  brandLocationId: brandLocationId.id,
                  timeZone: brandLocationId.timeZoneIdentifier
                });
              }
            }
          }
        }
      }
    }
    return { data, error: null };
  }

}

module.exports = Tag;
