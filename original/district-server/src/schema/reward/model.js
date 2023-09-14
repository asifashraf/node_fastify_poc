const { first, map } = require('lodash');
const BaseModel = require('../../base-model');
const { rewardError, rewardStatus } = require('../root/enums');
const QueryHelper = require('../../lib/query-helper');
const {
  addLocalizationField,
  transformToCamelCase,
} = require('../../lib/util');
const RewardReportFormatter = require('./reward-report-formatter');
const { createLoaders } = require('./loaders');

class Reward extends BaseModel {
  constructor(db, context) {
    super(db, 'rewards', context);
    this.loaders = createLoaders(this);
  }

  filterRewards(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
    }
    if (filters.status !== 'ALL') {
      query.where('rewards.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(rewards.title) like ? or rewards.title_ar like ? or rewards.title_tr like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  getAll(countryId, filters) {
    let query = super
      .getAll()
      .select(
        this.db.raw(
          'rewards.*, brands_rewards.brand_id as tiers_and_perks_brand_id'
        )
      )
      .join('brands_rewards', 'rewards.brand_id', 'brands_rewards.brand_id')
      .orderBy('rewards.created', 'desc');

    if (countryId) {
      query
        .join('brands', 'rewards.brand_id', 'brands.id')
        .where('brands.country_id', countryId);
    }
    if (filters) {
      query = this.filterRewards(query, filters);
    }
    return query;
  }

  async getAllPaged(countryId, paging, filters) {
    // const { countryId, paging, filters } = args;
    if (filters && !filters.status) {
      filters.status = 'ALL';
    }
    const query = this.getAll(countryId, filters);

    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rsp.items = addLocalizationField(
      addLocalizationField(rsp.items, 'title'),
      'conversionName'
    );
    return rsp;
  }

  getByBrandId(brandId) {
    // brand_id from reward table is not used anymore.
    // we use "brands_rewards" table to get reward by brand_id
    return this.db('brands_rewards')
      .select(
        this.db.raw(
          `${this.tableName}.*, brands_rewards.brand_id as tiers_and_perks_brand_id`
        )
      )
      .innerJoin(
        this.tableName,
        'brands_rewards.reward_id',
        `${this.tableName}.id`
      )
      .where('brands_rewards.brand_id', brandId)
      .orderBy(`${this.tableName}.created`, 'desc');
  }

  async validateRewardInput(rewardInput) {
    const errors = [];
    const brand = await this.context.brand.getById(rewardInput.brandId);

    if (brand) {
      if (!rewardInput.id) {
        const alreadyHaveReward = await this.db('brands_rewards').where(
          'brand_id',
          brand.id
        );
        if (alreadyHaveReward.length > 0) {
          errors.push(rewardError.BRAND_ALREADY_HAVE_REWARD);
        }
        const childBrands = rewardInput.childBrands || [];
        const promises = [];
        if (childBrands) {
          map(childBrands, async cbId => {
            promises.push(this.db('brands_rewards').where('brand_id', cbId));
          });
        }
        const res = await Promise.all(promises);

        if (res.length > 0) {
          map(res, r => {
            if (r.length > 0) {
              errors.push(rewardError.CHILD_BRAND_ALREADY_HAVE_REWARD);
            }
          });
        }
      }
    } else {
      errors.push(rewardError.INVALID_BRAND);
    }
    return errors;
  }

  childBrands(rewardId) {
    return this.db('brands_rewards')
      .select('brands.*')
      .innerJoin('brands', 'brands_rewards.brand_id', 'brands.id')
      .where('brands_rewards.reward_id', rewardId)
      .where('brands_rewards.main', false);
  }

  async save(rewardInput) {
    const { brandId, childBrands } = rewardInput;
    delete rewardInput.tierAndPerksBrandId;
    delete rewardInput.childBrands;
    const rewardId = await super.save(rewardInput);

    let relationExists = first(
      await this.db('brands_rewards').where('brand_id', brandId)
    );
    if (!relationExists) {
      await this.db('brands_rewards').insert({
        brandId,
        rewardId,
        main: true,
      });
    }
    await this.db('brands_rewards')
      .where('reward_id', rewardId)
      .where('main', false)
      .delete();
    if (childBrands) {
      map(childBrands, async cbId => {
        relationExists = first(
          await this.db('brands_rewards').where('brand_id', cbId)
        );
        if (!relationExists) {
          await this.db('brands_rewards').insert({
            brandId: cbId,
            rewardId,
            main: false,
          });
        }
      });
    }
    return rewardId;
  }

  async getAllToCSV(stream, countryId, searchTerm, filterType) {
    let query = this.roDb(this.tableName)
      .select('countries.name AS countryName', 'brands.name AS brandName')
      .select(
        this.db.raw(
          'rewards.*, brands_rewards.brand_id as tiers_and_perks_brand_id'
        )
      )
      .join('brands', 'rewards.brand_id', 'brands.id')
      .join('brands_rewards', 'rewards.brand_id', 'brands_rewards.brand_id')
      .join('countries', 'brands.country_id', 'countries.id')
      .where('brands.country_id', countryId)
      .orderBy('rewards.created', 'desc');

    query = this.filterRewards(query, {
      status: filterType,
      searchText: searchTerm,
    });

    // console.log('query', query.toString());
    return query
      .stream(s => s.pipe(new RewardReportFormatter()).pipe(stream))
      .catch(console.error);
  }

  async getActiveRewardByBrandId(brandId) {
    const queryParams = [brandId];
    const query = first(
      await this.roDb
        .raw(
          `
            select *
            from rewards r
            where r.brand_id = ?
            and r.status = 'ACTIVE'
          `,
          queryParams
        )
        .then(result => transformToCamelCase(result.rows))
    );
    return addLocalizationField(query, 'conversionName');
  }

  async checkRewardByBrandId(brandId) {
    return await this.roDb('brands_rewards')
      .select('*')
      .where('brand_id', brandId)
      .first();
  }

  async getRewardByBrandLocationId(brandLocationId) {
    const brandLocation = await this.context.brandLocation.getById(
      brandLocationId
    );
    const brand = await this.context.brand.getById(brandLocation.brandId);
    return first(
      await this.context.reward
        .getByBrandId(brand.id)
        .where('status', rewardStatus.ACTIVE)
    );
  }
}

module.exports = Reward;
