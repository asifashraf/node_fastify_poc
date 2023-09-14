/* eslint-disable camelcase */

const knex = require('../../database');
const { forEach, findIndex } = require('lodash');
const { uuid } = require('../lib/util');
const { getUserInfoByEmail } = require('../lib/auth');

knex
  .transaction(async () => {
    const brandLocations = await knex('brand_locations')
      .whereNotNull('email')
      .whereRaw(` lower(email) not in (select lower(email) from admins) `)
      .limit(50);

    const auth0Users = {};
    const admins = [];

    const p = new Promise(resolve => {
      let index = 0;
      forEach(brandLocations, async b => {
        b.email = b.email.toLowerCase().trim();
        if (b.email.length > 0) {
          const admin = await knex('admins')
            .where('email', b.email)
            .first();
          if (!admin) {
            // console.log('b.email', b.email);
            if (!auth0Users[b.email]) {
              let auth0User = await getUserInfoByEmail(
                encodeURIComponent(b.email)
              );
              // console.log('auth0User', auth0User);
              if (auth0User.length > 0) {
                auth0User = auth0User[0];
                auth0Users[b.email] = auth0User;
              }
            }

            const curUser = auth0Users[b.email];

            if (
              curUser &&
              findIndex(admins, a => {
                return a.email === b.email;
              }) === -1
            ) {
              const adminNewId = uuid.get();
              admins.push({
                id: adminNewId,
                name: curUser.name,
                email: curUser.email,
                autho_id: curUser.user_id,
                picture: curUser.picture,
              });
            }
          }
        }

        if (index === brandLocations.length - 1) resolve();

        index++;
      });
    });

    p.then(async () => {
      console.log('admins: ', admins.length);
      console.log('Run again: if admins is greater than 0');
      await knex('admins').insert(admins);
      console.log('All done!');
    });
  })
  .then(() => {})
  .catch(err => {
    console.error(err);
  });
