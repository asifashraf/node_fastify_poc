const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { redisTimeParameter } = require('../../../config');
const {
  cityCreateError,
  statusTypes,
  importCitiesError,
} = require('../root/enums');
const {
  addLocalizationField,
  validateCSVFileColumns,
} = require('../../lib/util');
const csv = require('fast-csv');
const { forEach } = require('lodash');

class City extends BaseModel {
  constructor(db, context) {
    super(db, 'cities', context);
    this.loaders = createLoaders(this);
  }

  async validateCSVFile({ mimetype }) {
    const errors = [];
    const errorDescription = null;
    if (mimetype !== 'text/csv' || mimetype !== 'text/csv') {
      errors.push(importCitiesError.INVALID_FILE);
    }

    return { errors, errorDescription };
  }

  async importCities({ stream }) {
    const errors = [];
    let errorDescription = null;

    const citiesToImport = [];

    const csvCitiesFileContentPromise = new Promise(resolve => {
      const list = [];
      stream
        .pipe(csv())
        .on('data', data => {
          list.push(data);
        })
        .on('end', () => {
          resolve(list);
        });
    });

    const list = await Promise.resolve(csvCitiesFileContentPromise);

    const requiredColumn = [
      'Name',
      'Name(Ar)',
      'Name(Tr)',
      'CountryCode',
      'Status',
    ];
    const headers = list[0];
    if (validateCSVFileColumns(headers, requiredColumn)) {
      errors.push(importCitiesError.INVALID_FILE_FORMAT);
      errorDescription = `Please keep the format of file in the following order: ${requiredColumn.join(
        ','
      )}`;
    } else {
      list.shift();
      const nameIndex = headers.indexOf(requiredColumn[0]);
      const nameArIndex = headers.indexOf(requiredColumn[1]);
      const nameTrIndex = headers.indexOf(requiredColumn[2]);
      const countryCodeIndex = headers.indexOf(requiredColumn[3]);
      const statusIndex = headers.indexOf(requiredColumn[4]);
      const uniqueCountryCodes = [];
      const uniqueName = [];
      const uniqueNameAr = [];
      const uniqueNameTr = [];
      const validateCountryCodes = [];
      forEach(list, l => {
        if (uniqueCountryCodes.indexOf(l[countryCodeIndex]) === -1) {
          uniqueCountryCodes.push(l[countryCodeIndex]);
          validateCountryCodes.push(
            this.db('countries')
              .where('iso_code', l[countryCodeIndex].toUpperCase())
              .first()
          );
        }
        if (uniqueName.indexOf(l[nameIndex]) === -1) {
          uniqueName.push(l[nameIndex]);
        } else {
          errors.push(importCitiesError.DUPLICATE_NAME);
        }
        if (uniqueNameAr.indexOf(l[nameArIndex]) === -1) {
          uniqueNameAr.push(l[nameArIndex]);
        } else {
          errors.push(importCitiesError.DUPLICATE_NAME);
        }
        if (uniqueNameTr.indexOf(l[nameTrIndex]) === -1) {
          uniqueNameTr.push(l[nameTrIndex]);
        } else {
          errors.push(importCitiesError.DUPLICATE_NAME);
        }
        if (
          [
            statusTypes.ACTIVE,
            statusTypes.INACTIVE,
            statusTypes.DELETED,
          ].indexOf(l[statusIndex].toUpperCase()) === -1
        ) {
          errors.push(importCitiesError.INVALID_STATUS);
        }
      });
      const res = await Promise.all(validateCountryCodes);
      forEach(res, r => {
        if (r === undefined) {
          errors.push(importCitiesError.INVALID_COUNTRY);
          // return false;
        }
      });
      if (errors.length === 0) {
        forEach(list, l => {
          citiesToImport.push(
            this.addCity({
              name: l[nameIndex].trim(),
              nameAr: l[nameArIndex].trim(),
              nameTr: l[nameTrIndex].trim(),
              countryCode: l[countryCodeIndex].trim(),
              status: l[statusIndex].trim().toUpperCase(),
            })
          );
        });
        await Promise.all(citiesToImport);
      }
    }

    return { serverErrors: errors, serverErrorDescription: errorDescription };
  }

  async addCity(node) {
    const country = await this.db('countries')
      .where('iso_code', node.countryCode.toUpperCase())
      .first();
    if (country) {
      const city = await this.db(this.tableName)
        .where('name', node.name)
        .orWhere('name_ar', node.nameAr)
        .orWhere('name_tr', node.nameTr)
        .first();
      if (city) {
        await this.save({
          id: city.id,
          name: node.name,
          nameAr: node.nameAr,
          nameTr: node.nameTr,
          countryId: country.id,
          status: node.status,
        });
      } else {
        await this.save({
          name: node.name,
          nameAr: node.nameAr,
          nameTr: node.nameTr,
          countryId: country.id,
          status: node.status,
        });
      }
    }
  }

  getByCode(code) {
    return this.db(this.tableName)
      .where('code', code)
      .first();
  }

  async getAll() {
    return addLocalizationField(await super.getAll(), 'name');
  }

  filterCities(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
    }
    if (filters.status !== 'ALL') {
      query.where('cities.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(cities.name) like ? or cities.name_ar like ? or cities.name_tr like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`]);
    }
    return query;
  }

  async getByCountry(countryId, filters) {
    const query = this.db(this.tableName)
      .where('country_id', countryId)
      .orderBy('name', 'asc');
    return addLocalizationField(
      await this.context.sqlCache(
        this.filterCities(query, filters),
        redisTimeParameter.oneHourInSeconds
      ),
      'name'
    );
  }

  async getByCountryIso(isoCode, filters) {
    isoCode = (isoCode || '').toUpperCase();
    const query = this.db(this.tableName)
      .select('cities.*')
      .join('countries', 'countries.id', 'cities.country_id')
      .where('countries.iso_code', isoCode)
      .orderBy('cities.name', 'asc');
    return addLocalizationField(
      await this.context.sqlCache(
        this.filterCities(query, filters),
        redisTimeParameter.oneHourInSeconds
      ),
      'name'
    );
  }

  async validate(cityInput) {
    const errors = [];

    const country = await this.context.country.getById(cityInput.countryId);

    if (!country) {
      errors.push(cityCreateError.INVALID_COUNTRY);
    }

    return errors;
  }
}

module.exports = City;
