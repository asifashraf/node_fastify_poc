const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { redisTimeParameter } = require('../../../config');

const {
  neighborhoodCreateError,
  statusTypes,
  importNeighborhoodsError,
} = require('../root/enums');
const csv = require('fast-csv');
const { validateCSVFileColumns } = require('../../lib/util');
const { forEach } = require('lodash');

class Neighborhood extends BaseModel {
  constructor(db, context) {
    super(db, 'neighborhoods', context);
    this.loaders = createLoaders(this);
  }

  async validateCSVFile({ mimetype }) {
    const errors = [];
    const errorDescription = null;
    if (mimetype !== 'text/csv' || mimetype !== 'text/csv') {
      errors.push(importNeighborhoodsError.INVALID_FILE);
    }

    return { errors, errorDescription };
  }

  async importNeighborhoods({ stream }) {
    const errors = [];
    let errorDescription = null;

    const neighborhoodsToImport = [];

    const csvNeighborhoodsFileContentPromise = new Promise(resolve => {
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

    const list = await Promise.resolve(csvNeighborhoodsFileContentPromise);

    const requiredColumn = [
      'Name',
      'Name(Ar)',
      'Name(Tr)',
      'CountryCode',
      'CityName',
      'Status',
    ];
    const headers = list[0];
    if (validateCSVFileColumns(headers, requiredColumn)) {
      errors.push(importNeighborhoodsError.INVALID_FILE_FORMAT);
      errorDescription = `Please keep the format of file in the following order: ${requiredColumn.join(
        ','
      )}`;
    } else {
      list.shift();
      const nameIndex = headers.indexOf(requiredColumn[0]);
      const nameArIndex = headers.indexOf(requiredColumn[1]);
      const nameTrIndex = headers.indexOf(requiredColumn[2]);
      const countryCodeIndex = headers.indexOf(requiredColumn[3]);
      const cityNameIndex = headers.indexOf(requiredColumn[4]);
      const statusIndex = headers.indexOf(requiredColumn[5]);
      const uniqueCountryCodes = [];
      const uniqueCityNames = [];
      const uniqueName = [];
      const uniqueNameAr = [];
      const uniqueNameTr = [];
      const validateCountryCodes = [];
      const validateCityNames = [];
      forEach(list, l => {
        if (uniqueCountryCodes.indexOf(l[countryCodeIndex]) === -1) {
          uniqueCountryCodes.push(l[countryCodeIndex]);
          validateCountryCodes.push(
            this.db('countries')
              .where('iso_code', l[countryCodeIndex].toUpperCase())
              .first()
          );
        }
        if (uniqueCityNames.indexOf(l[cityNameIndex]) === -1) {
          uniqueCityNames.push(l[cityNameIndex]);
          validateCityNames.push(
            this.db('cities')
              .join('countries', 'countries.id', 'cities.country_id')
              .where('cities.name', l[cityNameIndex])
              .where('countries.iso_code', l[countryCodeIndex].toUpperCase())
              .first()
          );
        }
        if (uniqueName.indexOf(l[nameIndex]) === -1) {
          uniqueName.push(l[nameIndex]);
        } else {
          errors.push(importNeighborhoodsError.DUPLICATE_NAME);
        }
        if (uniqueNameAr.indexOf(l[nameArIndex]) === -1) {
          uniqueNameAr.push(l[nameArIndex]);
        } else {
          errors.push(importNeighborhoodsError.DUPLICATE_NAME);
        }
        if (uniqueNameTr.indexOf(l[nameTrIndex]) === -1) {
          uniqueNameTr.push(l[nameTrIndex]);
        } else {
          errors.push(importNeighborhoodsError.DUPLICATE_NAME);
        }
        if (
          [
            statusTypes.ACTIVE,
            statusTypes.INACTIVE,
            statusTypes.DELETED,
          ].indexOf(l[statusIndex].toUpperCase()) === -1
        ) {
          errors.push(importNeighborhoodsError.INVALID_STATUS);
        }
      });
      const res = await Promise.all(validateCountryCodes);
      forEach(res, r => {
        if (r === undefined) {
          errors.push(importNeighborhoodsError.INVALID_COUNTRY);
          // return false;
        }
      });
      const res2 = await Promise.all(validateCityNames);
      forEach(res2, r => {
        if (r === undefined) {
          errors.push(importNeighborhoodsError.INVALID_CITY);
          // return false;
        }
      });
      if (errors.length === 0) {
        forEach(list, l => {
          neighborhoodsToImport.push(
            this.addNeighborhood({
              name: l[nameIndex].trim(),
              nameAr: l[nameArIndex].trim(),
              nameTr: l[nameTrIndex].trim(),
              countryCode: l[countryCodeIndex].trim(),
              cityName: l[cityNameIndex].trim(),
              status: l[statusIndex].trim().toUpperCase(),
            })
          );
        });
        await Promise.all(neighborhoodsToImport);
      }
    }

    return { serverErrors: errors, serverErrorDescription: errorDescription };
  }

  async addNeighborhood(node) {
    const country = await this.db('countries')
      .where('iso_code', node.countryCode.toUpperCase())
      .first();
    if (country) {
      const city = await this.db('cities')
        .select('cities.*')
        .join('countries', 'countries.id', 'cities.country_id')
        .where('cities.name', node.cityName)
        .where('countries.iso_code', node.countryCode.toUpperCase())
        .first();
      if (city) {
        const neighborhood = await this.db(this.tableName)
          .where('name', node.name)
          .orWhere('name_ar', node.nameAr)
          .orWhere('name_tr', node.nameTr)
          .first();
        if (neighborhood) {
          await this.save({
            id: neighborhood.id,
            name: node.name,
            nameAr: node.nameAr,
            nameTr: node.nameTr,
            cityId: city.id,
            status: node.status,
          });
        } else {
          await this.save({
            name: node.name,
            nameAr: node.nameAr,
            nameTr: node.nameTr,
            cityId: city.id,
            status: node.status,
          });
        }
      }
    }
  }

  filterNeighborhoods(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = statusTypes.ACTIVE;
    }
    if (filters.status !== 'ALL') {
      query.where('neighborhoods.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(neighborhoods.name) like ? or neighborhoods.name_ar like ? or neighborhoods.name_tr like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  getByBrandLocation(brandLocationId) {
    return this.loaders.byLocation.load(brandLocationId);
  }

  getByCity(cityId, filters) {
    let query = this.db(this.tableName)
      .where('city_id', cityId)
      .orderBy('name', 'asc');
    query = this.filterNeighborhoods(query, filters);
    return this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds);
  }

  getByCountryId(countryId, filters) {
    let query = this.db(this.tableName)
      .select('neighborhoods.*')
      .join('cities', 'neighborhoods.city_id', 'cities.id')
      .where('cities.country_id', countryId)
      .orderBy('neighborhoods.name', 'asc');
    query = this.filterNeighborhoods(query, filters);
    return this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds);
  }

  getByCountryIso(isoCode, filters) {
    isoCode = (isoCode || '').toUpperCase();
    let query = this.db(this.tableName)
      .select('neighborhoods.*')
      .join('cities', 'neighborhoods.city_id', 'cities.id')
      .join('countries', 'cities.country_id', 'countries.id')
      .where('countries.iso_code', isoCode)
      .orderBy('name', 'asc');
    query = this.filterNeighborhoods(query, filters);
    return this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds);
  }

  async saveForBrandLocation(brandLocationId, neighborhoodList) {
    return this.db('brand_locations_neighborhoods')
      .where('brand_location_id', brandLocationId)
      .delete()
      .then(() => {
        return this.db('brand_locations_neighborhoods').insert(
          neighborhoodList
        );
      });
  }

  async validate(neighborhoodInput) {
    const errors = [];

    const city = await this.context.city.getById(neighborhoodInput.cityId);

    if (!city) {
      errors.push(neighborhoodCreateError.INVALID_CITY);
    } else if (neighborhoodInput.id) {
      const neighborhood = await this.db(this.tableName)
        .select('*')
        .where('city_id', neighborhoodInput.cityId)
        .whereRaw('LOWER(name) ILIKE ?', [`${neighborhoodInput.name}`]);
      if (!neighborhood && neighborhood.id !== neighborhoodInput[0].id) {
        errors.push(neighborhoodCreateError.NEIGHBORHOOD_ALREADY_EXISTS);
      }
    } else if (
      (await this.db(this.tableName)
        .count('*')
        .where('city_id', neighborhoodInput.cityId)
        .whereRaw('LOWER(name) ILIKE ?', [`${neighborhoodInput.name}`]).first())['count'] > 0) {
      errors.push(neighborhoodCreateError.NEIGHBORHOOD_ALREADY_EXISTS);
    }
    return errors;
  }
}

module.exports = Neighborhood;
