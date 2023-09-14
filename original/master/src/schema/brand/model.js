// const cryptoRandomString = require('crypto-random-string');
const { clone, omit, forEach, map, filter } = require('lodash');
const BaseModel = require('../../base-model');
const {
  brandSaveError,
  rewardStatus,
  commissionModelType,
  brandStatus,
} = require('../root/enums');
const { isTest } = require('../../../config');
const { get: getFp } = require('lodash/fp');
const { addPaging, addLocalizationField } = require('../../lib/util');
const { createLoaders } = require('./loaders');
const BrandReportFormatter = require('./brand-report-formatter');
const moment = require('moment');

class Brand extends BaseModel {
  constructor(db, context) {
    super(db, 'brands', context);
    this.loaders = createLoaders(this);
  }

  async validate(brand) {
    const errors = [];
    let errorDescription = '';
    const isValid = await this.isValid(brand);
    if (!isValid) {
      errors.push(brandSaveError.INVALID_BRAND);
    }

    const id = await this.db(this.tableName)
      .where('name', brand.name)
      .where('country_id', brand.countryId)
      .then(getFp('[0].id'));

    if (id && id !== brand.id) {
      errors.push(brandSaveError.DUPLICATE_NAME);
    }

    // check commision type
    if (
      brand.commissionModelType &&
      brand.commissionModelType ===
        commissionModelType.NON_ZERO_COMMISSION_MODEL
    ) {
      if (!brand.commission || Number(brand.commission) === 0) {
        errors.push(brandSaveError.COMMISSION_MISSING);
      }
    }

    const promisesAdminAlreadyExists = [];
    const brandWideOrderQueueLoginEmail = brand.brandWideOrderQueueLoginEmail
      ? brand.brandWideOrderQueueLoginEmail
      : [];
    const uniqueEmails = [];
    forEach(brandWideOrderQueueLoginEmail, b => {
      if (!b.deleted) {
        if (uniqueEmails.indexOf(b.email) === -1) {
          uniqueEmails.push(b.email);
          promisesAdminAlreadyExists.push(
            this.context.brandAdmin.isAlreadyBrandAdmin(b.email)
          );
        } else {
          errors.push(brandSaveError.ADMIN_ALREADY_EXISTS);
          errorDescription = `${b.email} is already an admin of another brand or branch`;
        }
      }
    });

    const result = await Promise.all(promisesAdminAlreadyExists);
    forEach(result, r => {
      if (
        r !== undefined &&
        (r.brand_id || r.brand_location_id) &&
        r.brand_id !== brand.id
      ) {
        errors.push(brandSaveError.ADMIN_ALREADY_EXISTS);
        errorDescription = `${r.email} is already an admin of`;
        const brandMessage = r.brand_name ? `(${r.brand_name})` : '';
        const brandLocationMessage = r.brand_location_name
          ? `(${r.brand_location_name})`
          : '';
        if (brandLocationMessage) {
          errorDescription += ` branch ${brandLocationMessage} for brand ${brandMessage}`;
        } else {
          errorDescription += ` brand ${brandMessage}`;
        }
      }
    });
    return { errors, errorDescription };
  }

  async save(brand) {
    const brandWideOrderQueueLoginEmail =
      brand.brandWideOrderQueueLoginEmail || [];
    const commissionType = brand.commissionModelType;
    const commission = brand.commission || 0.0;

    brand = omit(brand, [
      'brandWideOrderQueueLoginEmail',
      'commissionModelType',
      'commission',
    ]);
    const brandId = await super.save(clone(brand)); // Clone because save mutates to snake_case for db
    let admins;
    if (!isTest) {
      const promisesAddDB = [];
      const promisesDelDB = [];
      if (brandWideOrderQueueLoginEmail.length > 0) {
        forEach(brandWideOrderQueueLoginEmail, async el => {
          if (el.deleted === true) {
            promisesDelDB.push(
              this.context.admin.deleteAdminForBrand({
                brandId,
                brandLocationId: null,
                email: el.email,
              })
            );
          } else {
            promisesAddDB.push(
              this.context.admin.addAdminForBrand({
                brandId,
                brandLocationId: null,
                name: brand.name,
                email: el.email,
                status: 'ACTIVE',
              })
            );
          }
        });
      }
      admins = filter(
        map(await Promise.all(promisesAddDB), n => {
          return n;
        }),
        n => {
          return n !== null;
        }
      );
      await Promise.all(promisesDelDB);
    }
    // if (commissionType === commissionModelType.ZERO_COMMISSION_MODEL) {
    //   commission = 0.0;
    // }
    const curTime = moment();
    const commissionModelData = {
      brandId,
      type: commissionType,
      percentage: commission,
      startTime: curTime,
      endTime: null,
    };

    const currentCommissionModel = await this.context.brandCommissionModel.getCurrentBrandModel(
      brandId
    );
    if (currentCommissionModel) {
      if (
        Number(currentCommissionModel.percentage) !==
        Number(commissionModelData.percentage)
      ) {
        await this.context.brandCommissionModel.save({
          id: currentCommissionModel.id,
          endTime: curTime,
        });
        await this.context.brandCommissionModel.save(commissionModelData);
      }
    } else {
      await this.context.brandCommissionModel.save(commissionModelData);
    }

    return { brandId, authProviderPassword: null, admins };
  }

  filterBrands(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
    }
    if (filters.status !== 'ALL') {
      query.where('brands.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(brands.name) like ? or brands.name_ar like ? or brands.name_tr like ?)'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  getAll(countryId, filters, catering, paging) {
    let query = super.getAll(paging).orderBy('name');
    if (countryId) {
      query.where('country_id', countryId);
    }
    query = this.filterBrands(query, filters);
    if (typeof catering !== 'undefined') {
      query.where('catering', catering);
    }
    return query;
  }

  async getByBrandLocation(brandLocationId) {
    return this.db(this.tableName).where('id',
      this.db('brand_locations')
        .select('brand_id')
        .where('id', brandLocationId).first())
      .first();
  }

  getAllByCountryId(countryId, filters, catering, paging) {
    let query = this.roDb(this.tableName).where('country_id', countryId);
    query = this.filterBrands(query, filters);
    if (typeof catering !== 'undefined') {
      query.where('catering', catering);
    }
    return addPaging(query, paging);
  }
  getAllByCountryIso(countryIso, filters, catering, paging) {
    let query = this.roDb(this.tableName)
      .select('brands.*')
      .join('countries', 'countries.id', 'brands.country_id')
      .where('iso_code', countryIso.toUpperCase());
    query = this.filterBrands(query, filters);
    if (typeof catering !== 'undefined') {
      query.where('brands.catering', catering);
    }
    return addPaging(query, paging);
  }
  getAllCateringBrands(countryIso, filters, paging) {
    let query = this.roDb(this.tableName)
      .select('brands.*')
      .join('countries', 'countries.id', 'brands.country_id')
      .where('iso_code', countryIso.toUpperCase());
    query = this.filterBrands(query, filters);
    query.where('brands.catering', true);
    return addPaging(query, paging);
  }

  getAllWithActiveRewards(countryCode, filters, catering) {
    let query = this.roDb(this.tableName)
      .select(`${this.tableName}.*`)
      .innerJoin(
        'brands_rewards',
        'brands_rewards.brand_id',
        `${this.tableName}.id`
      )
      .innerJoin(
        this.context.reward.tableName,
        'brands_rewards.reward_id',
        `${this.context.reward.tableName}.id`
      )
      .where(`${this.context.reward.tableName}.status`, rewardStatus.ACTIVE)
      .where('brands_rewards.main', true)
      .groupBy(`${this.tableName}.id`);
    if (countryCode) {
      query = query
        .innerJoin('countries', 'countries.id', 'brands.country_id')
        .where('countries.iso_code', countryCode);
    }
    query = this.filterBrands(query, filters);
    if (typeof catering !== 'undefined') {
      query.where('brands.catering', catering);
    }
    return query;
  }

  getAllWithoutRewards(countryId, filters, catering) {
    let query = this.roDb(this.tableName)
      .select(`${this.tableName}.*`)
      .leftJoin(
        'brands_rewards',
        `${this.tableName}.id`,
        'brands_rewards.brand_id'
      )
      .whereNull('brands_rewards.brand_id')
      .groupBy(`${this.tableName}.id`);

    if (countryId) {
      query.where(`${this.tableName}.country_id`, countryId);
    }
    query = this.filterBrands(query, filters);
    if (typeof catering !== 'undefined') {
      query.where(`${this.tableName}.catering`, catering);
    }
    return query;
  }

  async getAllToCSV(stream, countryId, searchTerm, filterType) {
    let query = this.roDb(this.tableName)
      .select(
        'brands.*',
        'countries.name AS countryName',
        this.roDb.raw(
          '(select count(*) from coupons inner join brands_coupons on brands_coupons.coupon_id = coupons.id where brands_coupons.brand_id = brands.id and coupons.country_id = countries.id) vouchers'
        ),
        this.roDb.raw(
          '(select count(*) from brand_locations where brand_locations.brand_id = brands.id and brand_locations.status = \'ACTIVE\') branches'
        )
      )
      .join('countries', 'brands.country_id', 'countries.id')
      .where('country_id', countryId);

    query = this.filterBrands(query, {
      status: filterType,
      searchText: searchTerm,
    });

    // console.log('query', query.toString());
    return query
      .stream(s => s.pipe(new BrandReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  async getCountry(brandId) {
    const [country] = await this.roDb('countries')
      .select('countries.*')
      .innerJoin('brands', 'brands.country_id', 'countries.id')
      .where('brands.id', brandId);
    return country;
  }

  async getCurrency(brandId) {
    return this.loaders.currency.load(brandId);
  }

  getBrandsByCountry(countryId) {
    const query = this.roDb(this.tableName)
      .where('country_id', countryId)
      .where('status', 'ACTIVE');
    return query;
  }

  getAllWithoutPaging(countryId, filters, catering) {
    let query = this.roDb(this.tableName).select('brands.*').orderBy('name');
    if (countryId) {
      query.where('country_id', countryId);
    }
    query = this.filterBrands(query, filters);
    if (typeof catering !== 'undefined') {
      query.where('catering', catering);
    }
    return query;
  }
  async getAllPaged(countryId, filters, catering, paging) {
    const query = this.getAllWithoutPaging(countryId, filters, catering);
    const response = await this.queryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    if (response.items) {
      response.items = addLocalizationField(response.items, 'name');
    }
    return response;
  }

  async getBrand(){
    // It must be 1 active brand in the table
    return await this.roDb(this.tableName)
      .select('brands.*')
      .where('status', brandStatus.ACTIVE)
      .first();
  }
}

module.exports = Brand;
