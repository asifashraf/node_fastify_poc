/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: add-roles');

knex.transaction(async () => {
  const roles = require('../../database/seeds/objects/roles')();
  const rolesToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    const keys = Object.keys(roles);
    Object.keys(roles).forEach(async key => {
      const role = roles[key];
      const r = await knex('roles')
        .where('name', role.name)
        .first();
      if (!r) {
        rolesToInsert.push(role);
      }
      if (index === keys.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('rolesToInsert', rolesToInsert);
    await knex('roles').insert(rolesToInsert);
    console.log('All done!');
  });
});
