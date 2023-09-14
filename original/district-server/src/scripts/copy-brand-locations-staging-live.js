/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Not used anymore - To be removed');
// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
if (process.env.STAGING_DATABASE_URL) {
  const knexStaging = require('knex')({
    client: 'pg',
    debug: false,
    connection: process.env.STAGING_DATABASE_URL,
  });
  const brandLocationsToCopy = [
    {
      id: '',
      usedToBeBrandId: '',
    },
  ];

  knex
    .transaction(async trx => {
      return Promise.all(
        brandLocationsToCopy.map(async brandLocationToCopy => {
          const brandLocation = await knexStaging('brand_locations').where({
            id: brandLocationToCopy.id,
          });
          if (brandLocation) {
            await trx('brand_locations').insert(brandLocation);
            const brandLocationAddresses = await knexStaging(
              'brand_location_addresses'
            ).where({
              brand_location_id: brandLocation.id,
            });
            await trx('brand_location_addresses').insert(
              brandLocationAddresses
            );

            const brandLocationsNeighborhoods = await knexStaging(
              'brand_locations_neighborhoods'
            ).where({
              brand_location_id: brandLocation.id,
            });
            await trx('brand_locations_neighborhoods').insert(
              brandLocationsNeighborhoods
            );

            const usedToBeBrandLocationsIds = (await trx(
              'brand_locations'
            ).where({
              brand_id: brandLocationToCopy.usedToBeBrandId,
            })).map(bl => bl.id);

            await trx('order_sets')
              .whereIn('brand_location_id', usedToBeBrandLocationsIds)
              .update({ brand_location_id: brandLocation.id });
          }
        })
      );
    })
    .then(async () => {
      console.log('all done!');
      await knexStaging.destroy();
      return knex.destroy();
    })
    .catch(async err => {
      console.log('error', err);
      await knexStaging.destroy();
      return knex.destroy().then(knexStaging.destroy);
    });
} else {
  console.log('no staging connection string');
}
