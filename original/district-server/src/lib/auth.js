const httpAuth = require('http-auth');
const { apiAuthToken, auth } = require('../../config');
const firebase = require('./firebase');
const { map } = require('lodash');
const { sqlCache } = require('../lib/sql-cache');

const cache = sqlCache();
const basic = httpAuth.basic(
  {
    realm: 'SUPER SECRET STUFF',
  },
  function (username, password, callback) {
    callback(username === 'bpxl' && password === 'bpxl');
  }
);
const basicAuthMiddleware = basic.check;

function tokenAuthMiddleware(req, res, next) {
  if (req.get('API-TOKEN') !== apiAuthToken) {
    return res.status(401).send('Unauthorized');
  }
  next();
}

async function getUserInfoByEmailFireBase(email) {
  try {
    return await firebase.getUserByEmail(email);
  } catch (err) {
    return { error: err.code };
  }
}

const auth0Permissions = {
  orderQueueAccess: 'orderQueue:access',
  orderView: 'order:view',
  orderUpdate: 'order:update',
  orderExport: 'order:export',
  courierAssign: 'courier:assign',
  statusUpdate: 'status:update',
  settingsView: 'settings:view',
  settingsUpdate: 'settings:update',
  voucherView: 'voucher:view',
  voucherUpsert: 'voucher:upsert',
  voucherDelete: 'voucher:delete',
  voucherExport: 'voucher:export',
  brandView: 'brand:view',
  brandUpsert: 'brand:upsert',
  brandDelete: 'brand:delete',
  brandExport: 'brand:export',
  menuView: 'menu:view',
  menuUpsert: 'menu:upsert',
  menuDelete: 'menu:delete',
  menuExport: 'menu:export',
  brandlocationView: 'brandlocation:view',
  brandlocationUpsert: 'brandlocation:upsert',
  brandlocationDelete: 'brandlocation:delete',
  brandlocationExport: 'brandlocation:export',
  customerUpsert: 'customer:upsert',
  // permissions for currency
  currencyUpsert: 'currency:upsert',
  countryUpsert: 'country:upsert',
  cityUpsert: 'city:upsert',
  neighborhoodUpsert: 'neighborhood:upsert',
  brandSubscriptionUpsert: 'brandsubscription:upsert',
  groupUpsert: 'group:upsert',
  roleUpsert: 'group:upsert',
  permissionUpsert: 'permission:upsert',
  adminUpsert: 'admin:upsert',
};

const auth0Roles = {
  CDO: 'CDO',
  CDA: 'CDA',
  CSE: 'CSE',
};

const iOSKeychainCredentials = {
  webcredentials: { apps: ['HYZE89J374.com.mawaqaa.cofe'] },
};

const getAdminPermissions = db => async authoId => {
  const permissions = await cache(
    db('group_admins AS ga')
      .select('p.name')
      .joinRaw(
        `inner join groups g on
              ga.group_id = g.id or
              g.id = (select group_id from nested_groups where nested_group_id = ga.group_id)`
      )
      .innerJoin('group_roles AS gr', 'g.id', 'gr.group_id')
      .innerJoin('role_permissions AS rp', 'gr.role_id', 'rp.role_id')
      .innerJoin('permissions AS p', 'rp.permission_id', 'p.id')
      .innerJoin('admins AS a', 'ga.admin_id', 'a.id')
      .where('a.autho_id', authoId)
  );
  return map(permissions, n => n.name);
};

const getAdminRoles = db => async authoId => {
  const roles = await cache(
    db('group_admins AS ga')
      .select('r.name')
      .joinRaw(
        `inner join groups g on
              ga.group_id = g.id or
              g.id = (select group_id from nested_groups where nested_group_id = ga.group_id)`
      )
      .innerJoin('group_roles AS gr', 'g.id', 'gr.group_id')
      .innerJoin('roles AS r', 'gr.role_id', 'r.id')
      .innerJoin('admins AS a', 'ga.admin_id', 'a.id')
      .where('a.autho_id', authoId)
  );

  return map(roles, n => n.name);
};

const getAdminInfo = db => async authoId => {
  const brandAdminListTemp = await db('brand_admins AS ba')
    .select('ba.*')
    .leftJoin('admins AS a', 'ba.admin_id', 'a.id')
    .where('a.autho_id', authoId)
    .where('a.status', 'ACTIVE');
  const brandAdminList = brandAdminListTemp.filter(brandAdmin => brandAdmin.brandId && brandAdmin.brandLocationId === null).map(brandAdmin => brandAdmin.brandId);
  const branchAdminList = brandAdminListTemp.filter(brandAdmin => brandAdmin.brandId && brandAdmin.brandLocationId !== null).map(brandAdmin => brandAdmin.brandLocationId);
  return {
    brandAdminList,
    branchAdminList
  };
};

module.exports = {
  basicAuthMiddleware,
  tokenAuthMiddleware,
  getUserInfoByEmailFireBase,
  auth0Permissions,
  auth0Roles,
  auth,
  iOSKeychainCredentials,
  getAdminPermissions,
  getAdminRoles,
  getAdminInfo
};
