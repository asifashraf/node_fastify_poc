const knexCleaner = require('knex-cleaner');
const casual = require('casual');
const knex = require('../../index');
const { skipSeedTestOrders } = require('../../../config');
const { resetTable } = require('../utils');

// Re-seeding casual in between each object generation should help minimize the impact
// seeds have on each other when they are updated
let casualSeed = 1;
casual.seed(casualSeed++);
const configuration = require('../objects/configuration')();
casual.seed(casualSeed++);
const currencies = require('../objects/currencies')();
casual.seed(casualSeed++);
const countries = require('../objects/countries')();
casual.seed(casualSeed++);
const customerAddressesFields = require('../objects/customer-addresses-fields')();
casual.seed(casualSeed++);
const admins = require('../objects/admins')();
casual.seed(casualSeed++);
const permissions = require('../objects/permissions')();
casual.seed(casualSeed++);
const groups = require('../objects/groups')();
casual.seed(casualSeed++);
const roles = require('../objects/roles')();
casual.seed(casualSeed++);
const groupRoles = require('../objects/group-roles')(groups, roles);
casual.seed(casualSeed++);
const nestedGroups = require('../objects/nested-groups')(groups);
casual.seed(casualSeed++);
const groupAdmins = require('../objects/group-admins')(groups, admins);
casual.seed(casualSeed++);
const rolePermissions = require('../objects/role-permissions')(
  roles,
  permissions
);
casual.seed(casualSeed++);
const countryConfiguration = require('../objects/country-configuration')(
  countries
);
casual.seed(casualSeed++);

function seed() {
  return knexCleaner
    .clean(knex, {
      ignoreTables: ['migrations', 'migrations_lock', 'spatial_ref_sys'],
    })
    .then(() => resetTable('currencies', currencies))
    .then(() => resetTable('countries', countries))
    .then(() => resetTable('permissions', permissions))
    .then(() => resetTable('groups', groups))
    .then(() => resetTable('roles', roles))
    .then(() => resetTable('group_roles', groupRoles))
    .then(() => resetTable('nested_groups', nestedGroups))
    .then(() => resetTable('group_admins', groupAdmins))
    .then(() => resetTable('role_permissions', rolePermissions))
    .then(() => resetTable('configuration', configuration))
    .then(() =>
      resetTable('customer_addresses_fields', customerAddressesFields)
    );
}

module.exports = {
  seed,
  admins,
  permissions,
  groups,
  groupRoles,
  nestedGroups,
  groupAdmins,
  roles,
  rolePermissions,
  configuration,
  currencies,
  countries,
};
