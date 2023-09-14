/* eslint-disable camelcase */

const knex = require('../../database');
const { forEach } = require('lodash');
const { uuid } = require('../lib/util');

knex
  .transaction(async () => {
    const brandLocations = await knex('brand_locations').whereNotNull('email');
    const brandAdmins = [];

    const p = new Promise(resolve => {
      let index = 0;
      forEach(brandLocations, async b => {
        const admin = await knex('admins')
          .whereRaw(` lower(email) = '${b.email.toLowerCase()}' `)
          .first();

        if (admin) {
          const brandAdmin = await knex('brand_admins')
            .where('admin_id', admin.id)
            .where('brand_id', b.brand_id)
            .where('brand_location_id', b.id)
            .first();

          if (!brandAdmin) {
            brandAdmins.push({
              id: uuid.get(),
              admin_id: admin.id,
              brand_id: b.brand_id,
              brand_location_id: b.id,
            });
          }
        }

        if (index === brandLocations.length - 1) resolve();

        index++;
      });
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
