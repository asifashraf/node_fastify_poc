const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { newBrandsSaveError, newBrandLiteError } = require('../root/enums');
const { newBrandsListMaxCount } = require('../../../config');
const {
  addLocalizationField,
  transformToCamelCase,
} = require('../../lib/util');

class NewBrands extends BaseModel {
  constructor(db, context) {
    super(db, 'new_brands', context);
    this.viewName = 'view_orders';
    this.loaders = createLoaders(this);
  }

  async getListByCountryForAdminPortal({ countryId, countryIso }) {
    if (!countryIso && !countryId) return [];
    if (!countryId) {
      const country = await this.context.country.getByCode(countryIso);
      countryId = country.id;
    }
    return this.getAll()
      .select(this.roDb.raw(`${this.tableName}.*`))
      .where('country_id', countryId)
      .orderBy('order', 'asc');
  }

  async getListByCountry({
    countryId,
    countryIso,
    customerId,
    longitude,
    latitude,
  }) {
    if (!countryIso && !countryId) return [];
    if (!countryId) {
      const country = await this.context.country.getByCode(countryIso);
      countryId = country.id;
    }
    const returnLimit = newBrandsListMaxCount;

    if (!customerId) {
      return this.getAll()
        .select(this.roDb.raw(`${this.tableName}.*`))
        .where('country_id', countryId)
        .limit(returnLimit);
    }
    // If customerId is present, don't include already purchased brands
    if (!longitude || !latitude) {
      return this.getAll()
        .select(this.roDb.raw(`${this.tableName}.*`))
        .whereRaw(`country_id = '${countryId}'`)
        .whereNotExists(function () {
          return this.select('*')
            .from('order_sets')
            .leftJoin(
              'brand_locations',
              'brand_locations.id',
              'order_sets.brand_location_id'
            )
            .whereRaw(`customer_id = '${customerId}'`)
            .andWhereRaw('new_brands.brand_id = brand_locations.brand_id');
        })
        .orderBy('order', 'asc')
        .limit(returnLimit);
    }
    // If geospacial data is present, then sort by closest branch
    return this.roDb
      .with('non_purchased_new_brands', npnb => {
        // This sub query ranks each location per brand by distance
        npnb
          .select(this.roDb.raw(`${this.tableName}.*`))
          .from(`${this.tableName}`)
          .whereRaw(`country_id = '${countryId}'`)
          .whereNotExists(function () {
            return this.select('*')
              .from('order_sets')
              .leftJoin(
                'brand_locations',
                'brand_locations.id',
                'order_sets.brand_location_id'
              )
              .whereRaw(`customer_id = '${customerId}'`)
              .andWhereRaw('new_brands.brand_id = brand_locations.brand_id');
          });
      })
      .select(
        `
            non_purchased_new_brands.*`,
        this.roDb.raw(
          `(select ROUND((ST_Distance(ST_Transform(brand_location_addresses.geolocation,7094),
              ST_Transform(ST_SetSRID(ST_Makepoint(${longitude}, ${latitude}),4326),7094)))) as distance
              from brand_locations
              left join  brand_location_addresses
              on brand_location_addresses.brand_location_id = brand_locations.id
              where non_purchased_new_brands.brand_id = brand_locations.brand_id
              order by distance asc
              limit 1) as distance`
        )
      )
      .from('non_purchased_new_brands')
      .orderBy('distance', 'asc')
      .limit(returnLimit);
  }
  async save(countryId, newBrands) {
    const currentList = await this.getListByCountryForAdminPortal({
      countryId,
    });
    // find creates and updates
    const input = newBrands.map(newBrand => {
      const oldRecord =
        currentList.find(({ brandId }) => brandId === newBrand.brandId) || {};
      return { ...oldRecord, ...newBrand, countryId };
    });
    // find deletes
    currentList.forEach(oldRecord => {
      if (!input.find(({ brandId }) => oldRecord.brandId === brandId)) {
        input.push({ ...oldRecord, deleted: true });
      }
    });
    return super.save(input);
  }
  validate(countryId, newBrands) {
    const errors = [];

    /**
     * @deprecated max limit control removed
     */
    // if (newBrands.length > newBrandsListMaxCount) {
    //   errors.push(newBrandsSaveError.MAX_COUNT_EXCEEDED);
    // }

    for (const { order } of newBrands) {
      const { length } = newBrands.filter(newBrand => newBrand.order === order);
      if (length > 1) {
        errors.push(newBrandsSaveError.DUPLICATE_ORDER);
        break;
      }
    }

    return errors;
  }
  async getLiteListByCountry({ countryIso, countryId, customerId }) {
    let reducedIdList = [];
    if (customerId) {
      const orderedBrandIdList = await this.roDb(this.viewName)
        .select('brand_id')
        .distinct('brand_id')
        .where('customer_id', customerId) // 'dK7Nn47QheYRrAqdwwpnbFcKfDA2' 15 days
        .andWhereRaw('created_at >= now() - INTERVAL \'3 months\'');
      reducedIdList = orderedBrandIdList.reduce((a, v) => {
        a.push(v.brandId);
        return a;
      }, []);
    }
    if (!countryId) {
      if (countryIso) {
        const country = await this.context.country.getByCode(countryIso);
        if (!country) {
          return { error: newBrandLiteError.INVALID_COUNTRY };
        }
        countryId = country.id;
      } else {
        return { error: newBrandLiteError.MISSING_COUNTRY_IDENTIFIER };
      }
    }
    const query = this.roDb(this.tableName)
      .select('b.id', 'b.name', 'b.name_ar', 'b.name_tr', 'b.carousel_image')
      .joinRaw('left join brands b on new_brands.brand_id = b.id')
      .whereNotIn('b.id', reducedIdList)
      .andWhere('new_brands.country_id', countryId)
      .andWhere('b.status', 'ACTIVE')
      .orderByRaw('random() limit 10');
    return {
      newBrands: addLocalizationField(
        await query.then(transformToCamelCase),
        'name'
      ),
    };
  }
}

module.exports = NewBrands;
