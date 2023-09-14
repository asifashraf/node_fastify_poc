/* eslint-disable camelcase */
const knex = require('../../database');
const { getUserInfoByEmail } = require('../lib/auth');
const { forEach } = require('lodash');
const { uuid } = require('../lib/util');

console.log('Running: add-brand-group');

knex.transaction(async () => {
  const groupAdminsToInsert = [];
  const admins = await knex('brand_admins')
    .select('admins.*')
    .join('admins', 'admins.id', 'brand_admins.admin_id')
    .whereNotNull('admins.email')
    .whereRaw(
      ` admins.id not in (select admin_id from group_admins inner join groups on group_admins.group_id = groups.id where groups.name = 'CSE') `
    )
    .limit(50);

  const cseGroup = await knex('groups')
    .where('name', 'CSE')
    .first();
  // console.log('cseGroup.CSE', cseGroup);

  let index = 0;
  const promise = new Promise(resolve => {
    if (cseGroup) {
      forEach(admins, async admin => {
        admin.email = admin.email.toLowerCase();
        let auth0User = await getUserInfoByEmail(
          encodeURIComponent(admin.email)
        );

        if (auth0User.length > 0) {
          auth0User = auth0User[0];
          if (auth0User.app_metadata) {
            if (auth0User.app_metadata.authorization) {
              const _authorization = auth0User.app_metadata.authorization;
              const _roles = _authorization.roles;
              if (_roles.length > 0) {
                const _isCSE = _roles.includes('CSE');
                if (_isCSE) {
                  const groupAdmin = await knex('group_admins')
                    .where('admin_id', admin.id)
                    .where('group_id', cseGroup.id)
                    .first();
                  if (!groupAdmin) {
                    groupAdminsToInsert.push({
                      id: uuid.get(),
                      group_id: cseGroup.id,
                      admin_id: admin.id,
                    });
                  }
                }
              }
            }
          }
        }

        if (index === admins.length - 1) resolve();

        index++;
      });
    }
  });

  promise.then(async () => {
    console.log('groupAdminsToInsert', groupAdminsToInsert.length);
    console.log('Run again: if groupAdminsToInsert is greater than 0');
    await knex('group_admins').insert(groupAdminsToInsert);
    console.log('All done!');
  });
});
