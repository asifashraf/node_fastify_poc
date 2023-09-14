const { uniq, compact, split, join, cloneDeep, first } = require('lodash');

const { setupAuthContext } = require('../helpers/context-helpers');
const { uuid, transformToSnakeCase } = require('../lib/util');

exports.uploadCoupons = async (req, res) => {
  const context = await setupAuthContext(req);
  const auth = context.auth;
  const admin = await context.admin.getByAuthoId(auth.id);
  const hasPermission = admin && !auth.isVendorAdmin && auth.permissions.includes('voucher:upload');
  if (hasPermission) {
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
    const countCode = first(await context.db
      .select(context.db.raw('count(*)'))
      .table('coupons')
      .whereIn('code', codesList));
    if (countCode.count > 0) {
      return res
        .status(400)
        .json({
          message: 'Some coupons are already updated.',
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

      codeObjectList.map(async codeObject => {
        couponColumnValues.push({...cloneParams, id: codeObject.id, code: codeObject.code});
        if (params.brands.length > 0) {
          params.brands.map(async brand => {
            brandsCouponsValue.push({coupon_id: codeObject.id, brand_id: brand});
          });
        }
        if (params.brand_locations?.length > 0) {
          params.brand_locations.map(async brandLocation => {
            brandLocationCouponsValue.push({coupon_id: codeObject.id, brand_location_id: brandLocation});
          });
        }
        couponDetails.map(async detail => {
          detail.id = uuid.get();
          couponDetailsValue.push({coupon_id: codeObject.id, ...detail});
        });
      });
      await context.db.client.pool.release(client);
      const chunkSize = 250;
      await context.db.transaction(async trx => {
        // await trx('coupons').insert(couponColumnValues);
        await trx.batchInsert('coupons', couponColumnValues, chunkSize);
        if (brandsCouponsValue.length > 0) {
          // await trx('brands_coupons').insert(brandsCouponsValue);
          await trx.batchInsert('brands_coupons', brandsCouponsValue, chunkSize);
        }
        if (brandLocationCouponsValue.length > 0) {
          // await trx('brand_locations_coupons').insert(brandLocationCouponsValue);
          await trx.batchInsert('brand_locations_coupons', brandLocationCouponsValue, chunkSize);
        }
        // await trx('coupon_details').insert(couponDetailsValue);
        await trx.batchInsert('coupon_details', couponDetailsValue, chunkSize);
        return res.status(200).end('ok');
      }).catch(err => {
        return res
          .status(400)
          .json({
            message: 'Coupons Upload failed with transactional functions.',
            caughtError: err,
          });
      });
    } catch (err) {
      console.log('Error at Coupons Upload');
      return res
        .status(400)
        .json({
          message: 'Coupons Upload failed.',
          caughtError: err,
        });
    }
  } else return res.status(401).send('Insufficient authority');
};
