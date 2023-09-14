/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: add-admins');

knex.transaction(async () => {
  const admins = require('../../database/seeds/objects/admins')();
  const adminsToInsert = [];
  let index = 0;
  const promise = new Promise(resolve => {
    const keys = Object.keys(admins);
    Object.keys(admins).forEach(async key => {
      const admin = admins[key];
      const a = await knex('admins')
        .where('email', admin.email)
        .first();
      if (!a) {
        adminsToInsert.push(admin);
      }
      if (index === keys.length - 1) resolve();

      index++;
    });
  });

  promise.then(async () => {
    // console.log('adminsToInsert', adminsToInsert);
    await knex('admins').insert(adminsToInsert);
    console.log('All done!');
  });
});
