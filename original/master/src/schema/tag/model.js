const BaseModel = require('../../base-model');
const { tagSaveError } = require('./enums');
const { addPaging, formatError, addLocalizationMultipleFields, removeLocalizationMultipleFields } = require('../../lib/util');
const { omit } = require('lodash');

class Tag extends BaseModel {
  constructor(db, context) {
    super(db, 'tags', context);
  }

  getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters.searchText) {
      query = query.whereRaw('(LOWER(name) iLIKE LOWER(?) or LOWER(name_ar) iLIKE LOWER(?) or LOWER(name_tr) iLIKE LOWER(?))'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`]);
    }
    filters = omit(filters, [
      'searchText'
    ]);
    if (filters) {
      query = query.andWhere(filters);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

  async getByFilters(filters, paging) {
    return addLocalizationMultipleFields(await this.getQueryByFilters(filters, paging), ['name', 'description', 'iconUrl']);
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
}

module.exports = Tag;
