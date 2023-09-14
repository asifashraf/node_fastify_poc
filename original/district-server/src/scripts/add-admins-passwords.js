/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: admin passwords update');

const users = require('./cofe-district_appUsers.json');
knex.transaction(async () => {
  const admins = await knex('admins');
  let found = 0;
  const jobs = [];
  admins.forEach(admin => {
    const user = users.users.find(u => u.email === admin.email);
    if (user) {
      found++;
      jobs.push(
        knex('admins')
          .update('password', user.passwordHash)
          .where({ id: admin.id })
      );
    }
  });
  await Promise.all(jobs);
  console.log(`updated passwords for ${found} users`);
});
