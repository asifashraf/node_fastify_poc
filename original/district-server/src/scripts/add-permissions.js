/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: add-permissions');

knex.transaction(async () => {
  const permissions = require('../../database/seeds/objects/permissions')();
  const permissionsToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    const keys = Object.keys(permissions);
    Object.keys(permissions).forEach(async key => {
      const permission = permissions[key];
      const p = await knex('permissions')
        .where('name', permission.name)
        .first();
      if (!p) {
        permissionsToInsert.push(permission);
      }
      if (index === keys.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('permissionsToInsert', permissionsToInsert);
    await knex('permissions').insert(permissionsToInsert);
    console.log('All done!');
  });
});
