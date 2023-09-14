/* eslint-disable camelcase */

const knex = require('../../database');
const { forEach, findIndex } = require('lodash');
const { uuid } = require('../lib/util');
const { getUserInfoByEmail } = require('../lib/auth');

knex
  .transaction(async () => {
    const brands = await knex('brands')
      .whereNotNull('brand_wide_order_queue_login_email')
      .whereRaw(
        ` lower(brand_wide_order_queue_login_email) not in (select lower(email) from admins) `
      )
      .limit(50);

    const auth0Users = {};
    const admins = [];

    const p = new Promise(resolve => {
      let index = 0;
      forEach(brands, async b => {
        b.brand_wide_order_queue_login_email = b.brand_wide_order_queue_login_email
          .toLowerCase()
          .trim();
        if (b.brand_wide_order_queue_login_email.length > 0) {
          const admin = await knex('admins')
            .where('email', b.brand_wide_order_queue_login_email)
            .first();

          if (!admin) {
            if (!auth0Users[b.brand_wide_order_queue_login_email]) {
              let auth0User = await getUserInfoByEmail(
                encodeURIComponent(b.brand_wide_order_queue_login_email)
              );

              if (auth0User.length > 0) {
                auth0User = auth0User[0];
                auth0Users[b.brand_wide_order_queue_login_email] = auth0User;
              }
            }
            const curUser = auth0Users[b.brand_wide_order_queue_login_email];

            if (
              curUser &&
              findIndex(admins, a => {
                return a.email === b.brand_wide_order_queue_login_email;
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

        if (index === brands.length - 1) resolve();

        index++;
      });
    });

    p.then(async () => {
      console.log('admins', admins.length);
      console.log('Run again: if admins is greater than 0');
      await knex('admins').insert(admins);
      console.log('All done!');
    });
  })
  .then(() => {})
  .catch(err => {
    console.error(err);
  });
