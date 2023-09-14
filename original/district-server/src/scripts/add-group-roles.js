/* eslint-disable camelcase */
const knex = require('../../database');
const { forEach } = require('lodash');
console.log('Running:add-group-roles');

knex.transaction(async () => {
  const roleList = await knex('roles');
  const roles = {};
  forEach(roleList, r => {
    roles[r.name] = { id: r.id, name: r.name, description: r.description };
  });
  const groupList = await knex('groups');
  const groups = {};
  forEach(groupList, g => {
    groups[g.name] = {
      id: g.id,
      name: g.name,
      description: g.description,
    };
  });

  const groupRoles = require('../../database/seeds/objects/group-roles')(
    groups,
    roles
  );
  const groupRolesToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    groupRoles.forEach(async groupRole => {
      const gr = await knex('group_roles')
        .where('group_id', groupRole.group_id)
        .where('role_id', groupRole.role_id)
        .first();
      if (!gr) {
        groupRolesToInsert.push(groupRole);
      }
      if (index === groupRoles.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('groupRolesToInsert', groupRolesToInsert);
    await knex('group_roles').insert(groupRolesToInsert);
    console.log('All done!');
  });
});
