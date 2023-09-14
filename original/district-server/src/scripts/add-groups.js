/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: add-groups');

knex.transaction(async () => {
  const groups = require('../../database/seeds/objects/groups')();
  const groupsToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    const keys = Object.keys(groups);
    Object.keys(groups).forEach(async key => {
      const group = groups[key];
      const g = await knex('groups')
        .where('name', group.name)
        .first();
      if (!g) {
        groupsToInsert.push(group);
      }
      if (index === keys.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('groupsToInsert', groupsToInsert);
    await knex('groups').insert(groupsToInsert);
    console.log('All done!');
  });
});
