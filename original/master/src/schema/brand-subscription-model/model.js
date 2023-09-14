const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  statusTypes,
  importBrandSubscriptionModelError,
  brandSubscriptionModelError,
  revenueModel,
} = require('../root/enums');
const {
  validateCSVFileColumns,
  formatError,
  transformToCamelCase,
} = require('../../lib/util');
const csv = require('fast-csv');
const { first, forEach, assign } = require('lodash');
const moment = require('moment');
const { csvToJSON } = require('../../lib/aws-s3');
const QueryHelper = require('../../lib/query-helper');
const ModelReport = require('./models-report');

class BrandSubscriptionModel extends BaseModel {
  constructor(db, context) {
    super(db, 'brand_subscription_model', context);
    this.loaders = createLoaders(this);
  }

  async validateCSVFile({ mimetype }) {
    const errors = [];
    const errorDescription = null;
    if (mimetype !== 'text/csv') {
      errors.push(importBrandSubscriptionModelError.INVALID_FILE);
    }
    return { errors, errorDescription };
  }

  async validate({ brandId }) {
    const errors = [];
    const errorDescription = null;
    const brand = await this.context.brand.getById(brandId);
    if (!brand) {
      errors.push(brandSubscriptionModelError.INVALID_BRAND);
    }
    return { errors, errorDescription };
  }

  async importBrandSubscriptionsByS3(file) {
    const list = await csvToJSON({ uri: file.href });
    if (Array.isArray(list)) {
      const {
        serverErrors,
        serverErrorDescription,
      } = await this.importBrandSubscriptionModel(list);
      return {
        error: serverErrors.length > 0 ? serverErrors[0] : null,
        errors: serverErrors,
        errorDescription: serverErrorDescription,
      };
    }
    return {
      error: importBrandSubscriptionModelError.INVALID_URL,
      errors: [importBrandSubscriptionModelError.INVALID_URL],
      errorDescription: null,
    };
  }

  async importBrandSubscriptionsByFile(file) {
    return file
      .then(async stream => {
        // Check for initial validation errors
        const { errors } = await this.validateCSVFile(stream);
        if (errors.length > 0) {
          return formatError(errors, stream);
        }

        const csvSubscriptionFileContentPromise = new Promise(resolve => {
          const list = [];
          stream
            .createReadStream()
            .pipe(csv())
            .on('data', data => {
              list.push(data);
            })
            .on('end', () => {
              resolve(list);
            });
        });

        const list = await Promise.resolve(csvSubscriptionFileContentPromise);
        const {
          serverErrors,
          serverErrorDescription,
        } = await this.importBrandSubscriptionModel(list);
        return {
          error: serverErrors.length > 0 ? serverErrors[0] : null,
          errors: serverErrors,
          errorDescription: serverErrorDescription,
        };
      })
      .catch(() => {
        return {
          error: importBrandSubscriptionModelError.INVALID_FILE,
          errors: [importBrandSubscriptionModelError.INVALID_FILE],
          errorDescription: null,
        };
      });
  }

  async importBrandSubscriptionModel(list) {
    const errors = [];
    let errorDescription = null;

    const requiredColumn = [
      'Market',
      'Vendor ID',
      'Contract Sign date',
      'Contract Expiry date',
      'Auto-Renewal',
      'Revenue Model',
      'Currency',
      'Flat Rate (LC)',
      'Pickup Commission Percentage (%)',
      'Delivery Commission Percentage (%)',
      'Coffee Store Percentage (%)',
    ];
    const headers = list[0];
    if (validateCSVFileColumns(headers, requiredColumn)) {
      errors.push(importBrandSubscriptionModelError.INVALID_FILE_FORMAT);
      errorDescription = `Please keep the format of file in the following order: ${requiredColumn.join(
        ','
      )}`;
    } else {
      list.shift();
      const countryCodeIndex = headers.indexOf(requiredColumn[0]);
      const brandIdIndex = headers.indexOf(requiredColumn[1]);
      const signDateIndex = headers.indexOf(requiredColumn[2]);
      const expiryDateIndex = headers.indexOf(requiredColumn[3]);
      const autoRenewalIndex = headers.indexOf(requiredColumn[4]);
      const revenuModelIndex = headers.indexOf(requiredColumn[5]);
      const flatRateIndex = headers.indexOf(requiredColumn[7]);
      const pickupCommissionIndex = headers.indexOf(requiredColumn[8]);
      const deliveryCommissionIndex = headers.indexOf(requiredColumn[9]);
      const cofeStoreCommissionIndex = headers.indexOf(requiredColumn[10]);
      const countries = await this.roDb('countries').select(
        'iso_code',
        'id',
        'currency_id'
      );
      const brands = await this.roDb('brands').select(
        'name',
        'id',
        'country_id'
      );
      const brandSubscriptionList = [];
      const brandSubscriptionToImport = [];
      forEach(list, l => {
        const country = countries.filter(
          country => country.isoCode === l[countryCodeIndex].toUpperCase()
        );
        if (country.length === 1) {
          const brand = brands.filter(
            brand =>
              brand.id === l[brandIdIndex] && brand.countryId === country[0].id
          );
          if (brand.length === 1) {
            const brandSubscription = {
              brandId: brand[0].id,
              countryId: brand[0].countryId,
              currencyId: country[0].currencyId,
              status: statusTypes.ACTIVE,
              flatRate: null,
              deliveryCommission: null,
              pickupCommission: null,
              cofeStoreCommission: null,
              expiryDate: null,
            };
            if (l[flatRateIndex] !== '') {
              const flatRate = parseFloat(
                l[flatRateIndex].replace(/%/g, '')
              ).toFixed(3);
              if (isNaN(flatRate)) {
                errors.push(
                  importBrandSubscriptionModelError.INVALID_FLAT_RATE
                );
              } else assign(brandSubscription, { flatRate });
            }
            if (l[pickupCommissionIndex] !== '') {
              const pickupCommission = parseFloat(
                l[pickupCommissionIndex].replace(/%/g, '')
              ).toFixed(3);
              if (isNaN(pickupCommission)) {
                errors.push(
                  importBrandSubscriptionModelError.INVALID_PICKUP_COMMISSION
                );
              } else
                assign(brandSubscription, {
                  pickupCommission,
                });
            }
            if (l[deliveryCommissionIndex] !== '') {
              const deliveryCommission = parseFloat(
                l[deliveryCommissionIndex].replace(/%/g, '')
              ).toFixed(3);
              if (isNaN(deliveryCommission)) {
                errors.push(
                  importBrandSubscriptionModelError.INVALID_DELIVERY_COMMISSION
                );
              } else
                assign(brandSubscription, {
                  deliveryCommission,
                });
            }
            if (l[cofeStoreCommissionIndex] !== '') {
              const cofeStoreCommission = parseFloat(
                l[cofeStoreCommissionIndex].replace(/%/g, '')
              ).toFixed(3);
              if (isNaN(cofeStoreCommission)) {
                errors.push(
                  importBrandSubscriptionModelError.INVALID_COFE_STORE_COMMISSION
                );
              } else
                assign(brandSubscription, {
                  cofeStoreCommission,
                });
            }

            const signDate = moment(l[signDateIndex], 'DD.MM.YYYY');
            if (signDate.isValid()) {
              assign(brandSubscription, { signDate: signDate.toDate() });
              if (l[expiryDateIndex] !== '') {
                const expiryDate = moment(l[expiryDateIndex], 'DD.MM.YYYY');
                if (
                  expiryDate.isValid() &&
                  expiryDate.toDate().getTime() > signDate.toDate().getTime()
                ) {
                  assign(brandSubscription, {
                    expiryDate: expiryDate.toDate(),
                  });
                } else {
                  errors.push(
                    importBrandSubscriptionModelError.INVALID_EXPIRY_DATE
                  );
                }
              }
            } else {
              errors.push(importBrandSubscriptionModelError.INVALID_SIGN_DATE);
            }

            if (l[autoRenewalIndex] === '') {
              errors.push(
                importBrandSubscriptionModelError.INVALID_AUTO_RENEWAL
              );
            } else {
              assign(brandSubscription, {
                autoRenewal: l[autoRenewalIndex].toUpperCase() === 'YES',
              });
            }

            let model = '';
            switch (l[revenuModelIndex]) {
              case 'Zero-Commission':
                model = revenueModel.ZERO_COMMISSION_MODEL;
                break;
              case '% Commission':
                model = revenueModel.PERCENTAGE_COMMISSION_MODEL;
                break;
              case 'Fixed Platform':
                model = revenueModel.FIXED_PLATFORM_MODEL;
                break;
              default:
                break;
            }
            if (model === '') {
              errors.push(
                importBrandSubscriptionModelError.INVALID_REVENUE_MODEL
              );
            } else {
              assign(brandSubscription, { revenueModel: model });
            }
            brandSubscriptionList.push(brandSubscription);
          } else {
            errors.push(importBrandSubscriptionModelError.INVALID_BRAND);
          }
        } else {
          errors.push(importBrandSubscriptionModelError.INVALID_COUNTRY);
        }
      });
      if (errors.length === 0) {
        forEach(brandSubscriptionList, bS => {
          brandSubscriptionToImport.push(this.addBrandSubscription(bS));
        });
        await Promise.all(brandSubscriptionToImport);
      }
    }

    return { serverErrors: errors, serverErrorDescription: errorDescription };
  }

  async getActiveBrandSubscriptionModel(brandId) {
    const query = this.roDb(this.tableName)
      .where('brand_id', brandId)
      .where('status', statusTypes.ACTIVE)
      .orderBy('updated', 'desc')
      .then(transformToCamelCase);
    return first(await query);
  }

  async addBrandSubscription(model) {
    let latestId = null;
    const brandSubscriptions = await this.db('brand_subscription_model')
      .where('brand_id', model.brandId)
      .where('status', statusTypes.ACTIVE)
      .orderBy('updated', 'desc');
    if (brandSubscriptions.length > 0) {
      const bs = brandSubscriptions[0];
      const isSameModel = await this.isSameModel(bs, model);
      if (isSameModel) {
        latestId = await this.save({
          id: bs.id,
          expiryDate: model.expiryDate,
        });
      } else {
        await this.save({
          id: bs.id,
          status: statusTypes.INACTIVE,
        });
        latestId = await this.save(model);
      }
    } else {
      latestId = await this.save(model);
    }
    return latestId;
  }

  async isSameModel(oldModel, newModel) {
    const columnList = [
      'signDate',
      'expiryDate',
      'autoRenewal',
      'revenueModel',
      'flatRate',
      'pickupCommission',
      'deliveryCommission',
      'cofeStoreCommission',
    ];
    let isSame = true;
    forEach(columnList, column => {
      if (oldModel[column] instanceof Date) {
        isSame =
          moment(oldModel[column]).format('YYYY-MM-DD') ===
          moment(newModel[column]).format('YYYY-MM-DD')
            ? isSame
            : false;
        // eslint-disable-next-line eqeqeq
      } else if (oldModel[column] != newModel[column]) {
        isSame = false;
      }
    });
    return isSame;
  }

  brandSubscriptionModelsQuery({
    activeOnly = true,
    searchTerm,
    countryId,
    revenueModel: rm,
    month,
    year,
  }) {
    const tn = this.tableName;
    const query = this.roDb(tn).select(`${tn}.*`);

    if (countryId) {
      query.andWhere(`${tn}.country_id`, countryId);
    }

    if (activeOnly) {
      query.andWhereRaw(
        `${tn}.sign_date < now() and ${tn}.expiry_date > now()`
      );
    }
    if (searchTerm) {
      query.andWhere(`${tn}.revenue_model ILIKE '%${searchTerm}%' `);
    }

    if (
      [
        revenueModel.FIXED_PLATFORM_MODEL,
        revenueModel.PERCENTAGE_COMMISSION_MODEL,
        revenueModel.ZERO_COMMISSION_MODEL,
      ].indexOf(rm) !== -1
    ) {
      query.andWhere(`${tn}.revenue_model`, rm);
    }

    if (month && year) {
      const beginOfMonth = moment(`${year}-${month}-01`)
        .clone()
        .format('YYYY-MM-DD hh:mm');
      query.andWhereRaw(
        `date(${tn}.sign_date) < date('${beginOfMonth}') and date(${tn}.expiry_date) >= date('${beginOfMonth}')`
      );
    }

    query.where(`${tn}.status`, statusTypes.ACTIVE);
    query.orderBy(`${tn}.updated`, 'desc');
    return query;
  }

  async brandSubscriptionModels(input) {
    const query = this.brandSubscriptionModelsQuery(input);
    query.then(transformToCamelCase);
    const { paging } = input;
    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    return rsp;
  }

  async getReport(stream, input) {
    const query = this.brandSubscriptionModelsQuery(input);
    query.select(
      'brands.id as brand_id',
      'brands.name as brand_name',
      'countries.name as country_name',
      'currencies.symbol as currency_symbol'
    );

    query.join('brands', `${this.tableName}.brand_id`, 'brands.id');
    query.join('countries', 'brands.country_id', 'countries.id');
    query.join('currencies', 'countries.currency_id', 'currencies.id');
    return query
      .stream(s => s.pipe(new ModelReport()).pipe(stream))
      .catch(console.error);
  }

  async createInut(input) {
    const { brandId, signDate, expiryDate } = input;
    const brand = await this.context.brand.getById(brandId);
    if (brand) {
      const { countryId } = brand;

      const country = await this.context.country.getById(countryId);
      if (country) {
        const { currencyId } = country;
        return assign(input, {
          currencyId,
          countryId,
          status: statusTypes.ACTIVE,
          signDate: moment(signDate, 'DD.MM.YYYY').toDate(),
          expiryDate: moment(expiryDate, 'DD.MM.YYYY').toDate(),
        });
      }
    }
    return input;
  }
}

module.exports = BrandSubscriptionModel;
