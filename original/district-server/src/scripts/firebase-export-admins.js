const firebase = require('../lib/firebase');

const knex = require('../../database');
console.log('Running: firebase admin export');

knex.transaction(async () => {
  let users = await knex('admins');
  users = users
    .filter(
      user =>
        user.email !== '' &&
        user.autho_id !== '' &&
        user.autho_id !== null &&
        user.password !== null
    )
    .map(user => {
      return {
        uid: user.autho_id,
        email: user.email,
        passwordHash: Buffer.from(user.password),
        displayName: `${user.name}`,
        // photoURL: user.picture,
      };
    });

  firebase
    .createUsers(users, {
      hash: {
        algorithm: 'BCRYPT',
      },
    })
    .then(us => {
      console.log(JSON.stringify(us));
    })
    .catch(err => {
      console.log(JSON.stringify(err));
    });
});
