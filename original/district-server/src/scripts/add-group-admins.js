/* eslint-disable camelcase */
const knex = require('../../database');
const { forEach } = require('lodash');
console.log('Running: add-group-admins');

knex.transaction(async () => {
  const groupList = await knex('groups');
  const groups = {};
  forEach(groupList, g => {
    groups[g.name] = { id: g.id, name: g.name, description: g.description };
  });
  const adminList = await knex('admins');
  const admins = {};
  forEach(adminList, a => {
    admins[a.email] = {
      id: a.id,
      name: a.name,
      email: a.email,
      autho_id: a.autho_id,
    };
  });

  const groupAdmins = require('../../database/seeds/objects/group-admins')(
    groups,
    admins
  );
  const groupAdminsToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    groupAdmins.forEach(async groupAdmin => {
      const ga = await knex('group_admins')
        .where('group_id', groupAdmin.group_id)
        .where('admin_id', groupAdmin.admin_id)
        .first();
      if (!ga) {
        groupAdminsToInsert.push(groupAdmin);
      }
      if (index === groupAdmins.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('groupAdminsToInsert', groupAdminsToInsert);
    await knex('group_admins').insert(groupAdminsToInsert);
    console.log('All done!');
  });
});
