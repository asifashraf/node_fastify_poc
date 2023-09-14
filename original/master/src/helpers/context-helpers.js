const { get, extend, some } = require('lodash');

const {
  isDev,
  isTest,
  defaultUserId,
  defaultUserName,
  defaultUserEmail,
} = require('../../config');
const QueryContext = require('../query-context');
const { getAdminPermissions, getAdminRoles, getAdminInfo } = require('../lib/auth');
const { hasCustomerActiveCSubscription } = require('../lib/context-query');
const { pubsub } = require('../lib/util');

exports.isFirebaseUser = req => {
  return (
    req &&
    req.user &&
    req.user.authProvider &&
    req.user.authProvider === 'firebase'
  );
};

exports.setupAuthContext = async req => {
  const { db, redis, schema, mockUser } = req.serverConfig;

  const user = {};
  user.id = get(req.user, 'sub');
  user.email = get(req.user, 'email');
  user.name = get(req.user, 'name');
  user.authProvider = get(req.user, 'authProvider');
  user.hasActiveCSubscription = async ({ countryId, brandId, subscriptionId }) => {
    return hasCustomerActiveCSubscription(user.id)(db.handle)({ countryId, brandId, subscriptionId });
  };
  // Current Usage is
  // Admin/Vendor Portal -> Firebase
  // Customers -> SSO - Auth Service (auth service also has a disabled admin/vendor portal support, I have included it in the
  if (this.isFirebaseUser(req)) {
    user.permissions = await getAdminPermissions(db.handle)(user.id);
    user.roles = await getAdminRoles(db.handle)(user.id);
    user.brandAdminInfo = await getAdminInfo(db.handle)(user.id);
    user.isVendorAdmin = user.roles.includes('CSE');
    user.isBrandAdmin = (brandId) => {
      return some(user.brandAdminInfo.brandAdminList, t => t == brandId);
    };
    user.isBranchAdmin = (branchId) => {
      return some(user.brandAdminInfo.branchAdminList, t => t == branchId);
    };
  } else {
    const userType = get(req.user, 'userType');
    if (userType === 'ADMIN') {
      user.permissions = req.user.permissions;
      user.roles = req.user.roles;
    } else {
      user.permissions = [];
      /**
       * This role was added hardcoded otherwise we need to create a record
       * for all customers in role tables. But we have to take into
       * consideration this role inside authentication mechanism while
       * creating an authentication middleware
       */
      user.roles = ['CUSTOMER'];
    }
  }
  // NOTE: req.user.permissions is a safer lookup since app_metadata
  // only gets updated _after_ a user logs in making it potentially
  // out of sync with what is set in Auth0
  // user.permissions = get(req.user, 'permissions');

  // tests can pass in mock user informatsavedMetadataIdion to this function
  if (isTest) {
    extend(user, mockUser);
  }
  // local dev can pass a mock user id through environment var
  if (isDev && !isTest && !user.id && defaultUserId) {
    extend(user, {
      id: defaultUserId,
      permissions: ['dev_override'],
      name: defaultUserName,
      email: defaultUserEmail,
    });
  }
  // tests and local dev can pass mock user info in the request variables
  if (isDev) {
    extend(user, get(req.body, 'variables.__user', {}));
  }
  return new QueryContext(db, redis, user, pubsub, schema, req);
};

// TODO Check Where these are used
exports.setupQueryContextWithoutAuth = serverConfig => {
  const { db, redis, schema } = serverConfig;
  return new QueryContext(db, redis, {}, pubsub, schema);
};
