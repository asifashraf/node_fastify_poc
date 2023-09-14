/* eslint-disable camelcase */
const knex = require('../../database');
const { forEach } = require('lodash');
console.log('Running: add-role-permissions');

knex.transaction(async () => {
  const roleList = await knex('roles');
  const roles = {};
  forEach(roleList, r => {
    roles[r.name] = { id: r.id, name: r.name, description: r.description };
  });
  const permissionList = await knex('permissions');
  const permissions = {};
  forEach(permissionList, p => {
    permissions[p.name] = {
      id: p.id,
      name: p.name,
      description: p.description,
    };
  });

  const rolePermissions = require('../../database/seeds/objects/role-permissions')(
    roles,
    permissions
  );
  const rolePermissionsToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    rolePermissions.forEach(async rolePermission => {
      const rp = await knex('role_permissions')
        .where('role_id', rolePermission.role_id)
        .where('permission_id', rolePermission.permission_id)
        .first();
      if (!rp) {
        rolePermissionsToInsert.push(rolePermission);
      }
      if (index === rolePermissions.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('rolePermissionsToInsert', rolePermissionsToInsert);
    await knex('role_permissions').insert(rolePermissionsToInsert);
    console.log('All done!');
  });
});
