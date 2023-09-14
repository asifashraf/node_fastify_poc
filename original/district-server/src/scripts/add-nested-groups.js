/* eslint-disable camelcase */
const knex = require('../../database');
const { forEach } = require('lodash');
console.log('Running: add-nested-groups');

knex.transaction(async () => {
  const groupList = await knex('groups');
  const groups = {};
  forEach(groupList, g => {
    groups[g.name] = {
      id: g.id,
      name: g.name,
      description: g.description,
    };
  });

  const nestedGroups = require('../../database/seeds/objects/nested-groups')(
    groups
  );
  const nestedGroupsToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    nestedGroups.forEach(async nestedGroup => {
      const ng = await knex('nested_groups')
        .where('group_id', nestedGroup.group_id)
        .where('nested_group_id', nestedGroup.nested_group_id)
        .first();
      if (!ng) {
        nestedGroupsToInsert.push(nestedGroup);
      }
      if (index === nestedGroups.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('nestedGroupsToInsert', nestedGroupsToInsert);
    await knex('nested_groups').insert(nestedGroupsToInsert);
    console.log('All done!');
  });
});
