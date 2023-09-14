/*
How to run:
1. Export firebase users using firebase cli: "firebase auth:export firebase.json --project cofe-prod"
2. Set NODE_ENV = development, DATABASE_URL = <prod/staging/dev> connection url
3. node firebase-admin-import.js
*/

/* eslint-disable camelcase */
const knex = require('../../database');
const fs = require('fs');
console.log('Running: firebase-import-admins');

const firebaseUsers = JSON.parse(
  fs.readFileSync(process.env.FIREBASE_USERS_JSON || 'firebase.json')
);

const mappedFUsers = {};
firebaseUsers.users.forEach(user => {
  mappedFUsers[user.localId] = user;
});
importUsers(mappedFUsers)
  .then(d => {
    console.log('Finished import', d);
    return knex.destroy();
  })
  .then()
  .catch(err => console.error(err));

async function importUsers(users) {
  return knex.transaction(async () => {
    const adminIds = knex('admins')
      .select('autho_id')
      .then(admins => admins.map(admin => admin.autho_id));

    return adminIds.then(ids =>
      Promise.all(
        ids
          .filter(id => users[id])
          .map(id =>
            knex('admins')
              .update({
                password: users[id].passwordHash,
                salt: users[id].salt,
              })
              .where('autho_id', id)
          )
      )
    );
  });
}
