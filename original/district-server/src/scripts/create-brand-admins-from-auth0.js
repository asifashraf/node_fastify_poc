/* eslint-disable camelcase */

const knex = require('../../database');
const { forEach } = require('lodash');
const { uuid } = require('../lib/util');

knex
  .transaction(async () => {
    const brands = await knex('brands').whereNotNull(
      'brand_wide_order_queue_login_email'
    );

    const brandAdmins = [];

    const p = new Promise(resolve => {
      let index = 0;
      if (brands.length > 0) {
        forEach(brands, async b => {
          const admin = await knex('admins')
            .whereRaw(
              ` lower(email) = '${b.brand_wide_order_queue_login_email.toLowerCase()}' `
            )
            .first();
          if (admin) {
            const brandAdmin = await knex('brand_admins')
              .where('admin_id', admin.id)
              .where('brand_id', b.id)
              .where('brand_location_id', null)
              .first();

            if (!brandAdmin) {
              brandAdmins.push({
                id: uuid.get(),
                admin_id: admin.id,
                brand_id: b.id,
              });
            }
          }

          if (index === brands.length - 1) resolve();

          index++;
        });
      } else {
        resolve();
      }
    });

    p.then(async () => {
      // console.log('brandAdmins', brandAdmins);
      await knex('brand_admins').insert(brandAdmins);
      console.log('All done!');
    });
  })
  .then(() => {})
  .catch(err => {
    console.error(err);
  });
