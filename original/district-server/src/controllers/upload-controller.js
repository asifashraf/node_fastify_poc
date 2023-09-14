const { uniq, compact, split, join, cloneDeep, clone } = require('lodash');

const { setupAuthContext } = require('../helpers/context-helpers');
const { uuid, transformToSnakeCase } = require('../lib/util');

exports.uploadCoupons = async (req, res) => {
  const context = await setupAuthContext(req);
  const auth = context.auth;
  const admin = await context.admin.getByAuthoId(auth.id);
  const hasPermission = admin && !auth.isVendorAdmin && auth.permissions.includes('voucher:upload');
  if (!hasPermission) return res.status(401).send('Insufficient authority');
  const params = transformToSnakeCase(req.body);
  let codesList = cloneDeep(params.code_list);
  codesList = codesList.map(t => t.replace(/[\r\n]/gm, '').replace(/[^0-9a-zA-Z]/g, '').trim());
  if (!codesList || codesList.length === 0) {
    return res
      .status(400)
      .json({
        message: 'Invalid Code List',
      });
  }
  if (!params.brands || params.brands.length === 0) {
    return res
      .status(400)
      .json({
        message: 'Invalid Brands',
      });
  }
  delete params.code_list;
  // eslint-disable-next-line camelcase
  params.is_valid = params.status === 'ACTIVE';
  const [country] = await context
    .db('countries')
    .where('id', params.country_id);
  // eslint-disable-next-line camelcase
  params.currency_id = country.currencyId;

  const couponsFound = await context.db
    .select('id', 'code')
    .table('coupons')
    .whereIn('code', codesList);
  if (couponsFound.length > 0) {
    console.log(`Total coupon to be updated are: ${couponsFound.length}`);
    await bulkUpdate(res, params, context, couponsFound);
  }

  //// removing Coupons which are updated and not need to be inserted
  codesList = codesList.filter((code) => { return !couponsFound.find(x => x.code == code); });

  try {
    const client = await context.db.client.pool.acquire().promise;
    const codeObjectList = codesList.map(code => {
      return {
        id: uuid.get(),
        code,
      };
    });
    /* console.log(params.brands);
    params.brands = params.brands.join(',');
    console.log(params.brands);
    params.brand_locations = params.brand_locations
      ? params.brand_locations.join(',')
      : ''; */
    const { couponColumnValues,
      brandsCouponsValue,
      brandLocationCouponsValue,
      couponDetailsValue } = await prepareColumnValues(params, codeObjectList, context);

    await context.db.client.pool.release(client);
    const chunkSize = 250;
    await context.db.transaction(async trx => {
      // await trx('coupons').insert(couponColumnValues);
      if (couponColumnValues.length > 0) {
        await trx.batchInsert('coupons', couponColumnValues, chunkSize);
      }
      if (brandsCouponsValue.length > 0) {
        // await trx('brands_coupons').insert(brandsCouponsValue);
        await trx.batchInsert('brands_coupons', brandsCouponsValue, chunkSize);
      }
      if (brandLocationCouponsValue.length > 0) {
        // await trx('brand_locations_coupons').insert(brandLocationCouponsValue);
        await trx.batchInsert('brand_locations_coupons', brandLocationCouponsValue, chunkSize);
      }
      // await trx('coupon_details').insert(couponDetailsValue);
      if (couponDetailsValue.length > 0) {
        await trx.batchInsert('coupon_details', couponDetailsValue, chunkSize);
      }
      // return res.status(200).end('ok');
    }).catch(err => {
      throw err;
    });
  } catch (err) {
    console.log('Error at Coupons Insert/Upload');
    return res
      .status(400)
      .json({
        message: 'Coupons Upload failed.',
        caughtError: err,
      });
  }
  return res.status(200).end('ok');

};

async function processBatchUpdate(options, collection, context, trx) {

  const queries = collection.map(async (tuple) => {

    context.db(options.table)
      .where(options.column, tuple[options.column])
      .update(tuple)
      .transacting(trx);
  }
  );
  return await Promise.all(queries)
    .then(trx.commit)
    .catch(trx.rollback);

}

async function bulkUpdate(res, params, context, couponsFound) {
  ///Update Process start
  try {
    const client = await context.db.client.pool.acquire().promise;


    const { couponColumnValues,
      brandsCouponsValue,
      brandLocationCouponsValue,
      couponDetailsValue } = await prepareColumnValues(params, couponsFound, context);

    await context.db.client.pool.release(client);
    await context.db.transaction(async trx => {
      const queries = couponColumnValues.map(async (tuple) => {
        delete tuple.allowed_bank_cards;
        delete tuple.brand_location_ids;
        delete tuple.allowed_banks;
        delete tuple.allowed_payment_methods;
        delete tuple.brand_location_ids;
        delete tuple.enable_branches;
        context.db('coupons')
          .where('id', tuple['id'])
          .update(tuple)
          .transacting(trx);
      }
      );
      await Promise.all(queries)
        .then(trx.commit)
        .catch(trx.rollback);
      if (brandsCouponsValue.length > 0) {
        console.time('brands_coupons_timer');
        await processBatchUpdate({ table: 'brands_coupons', column: 'brand_id' }, brandsCouponsValue, context, trx);
        console.timeEnd('brands_coupons_timer');
      }
      if (brandLocationCouponsValue.length > 0) {
        console.time('brand_locations_coupons_timer');
        await processBatchUpdate({ table: 'brand_locations_coupons', column: 'brand_location_id' }, brandLocationCouponsValue, context, trx);
        console.timeEnd('brand_locations_coupons_timer');
      }
      console.time('coupon_details_timer');
      await processBatchUpdate({ table: 'coupon_details', column: 'coupon_id' }, couponDetailsValue, context, trx);
      console.timeEnd('coupon_details_timer');
    }).catch(err => {
      return res
        .status(400)
        .json({
          message: 'Coupons Update failed with transactional functions.',
          caughtError: err,
        });
    });
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .json({
        message: 'Coupons Update failed.',
        caughtError: err,
      });
  }


}

async function prepareColumnValues(params, codeObjectList, context) {
  if (params.valid_email_domains) {
    // eslint-disable-next-line camelcase
    params.valid_email_domains = join(
      uniq(
        compact(split(params.valid_email_domains.replace(/\s/g, ''), ','))
      ),
      ','
    );
  }

  const cloneParams = { ...params };
  delete cloneParams.brands;
  delete cloneParams.coupon_details;
  delete cloneParams.brand_locations;
  delete cloneParams.is_upload;
  const couponColumnValues = [];
  const brandsCouponsValue = [];
  const brandLocationCouponsValue = [];
  const couponDetailsValue = [];
  const couponDetails = params.coupon_details.map(detail => {
    detail = transformToSnakeCase(detail);
    if (detail.percent_paid_by_vendor !== null) {
      if (detail.percent_paid_by_vendor > 100) {
        detail.percent_paid_by_vendor = 100;
        detail.percent_paid_by_cofe = 0;
      } else if (detail.percent_paid_by_vendor < 0) {
        detail.percent_paid_by_vendor = 0;
        detail.percent_paid_by_cofe = 100;
      } else {
        detail.percent_paid_by_cofe = 100 - detail.percent_paid_by_vendor;
      }
    } else {
      delete detail.percent_paid_by_vendor;
      delete detail.percent_paid_by_cofe;
    }
    return detail;
  });
  const brandLocationsToSearch = clone(params.brand_locations);


  codeObjectList.map(async codeObject => {
    const dataForcouponColumnValues = { ...cloneParams };
    delete dataForcouponColumnValues.allowed_bank_cards;
    delete dataForcouponColumnValues.allowed_banks;
    delete dataForcouponColumnValues.allowed_payment_methods;
    delete dataForcouponColumnValues.enable_branches;
    couponColumnValues.push({ ...dataForcouponColumnValues, id: codeObject.id, code: codeObject.code });
    if (params.brands.length > 0) {
      params.brands.map(async brand => {
        brandsCouponsValue.push({ coupon_id: codeObject.id, brand_id: brand });
      });
    }
    if (params.brand_locations?.length > 0) {
      params.brands.map(async (brandId) => {
        const locationsIds = await context.db('brand_locations')
          .select('id')
          .where('brand_id', brandId)
          .whereIn('id', brandLocationsToSearch);
        if (locationsIds.length > 0) {
          locationsIds.map(brandLocation => {
            brandLocationCouponsValue.push({ coupon_id: codeObject.id, brand_location_id: brandLocation.id });
          });
        }
      });
    }

    couponDetails.map(async detail => {
      detail.id = uuid.get();
      couponDetailsValue.push({ coupon_id: codeObject.id, ...detail });
    });
  });
  return {
    couponColumnValues,
    brandsCouponsValue,
    brandLocationCouponsValue,
    couponDetailsValue

  };
}
