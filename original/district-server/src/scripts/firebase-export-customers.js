const firebase = require('../lib/firebase');

const knex = require('../../database');
console.log('Running: firebase customers export');

knex.transaction(async () => {
  let users = await knex('customers');
  users = users
    .filter(
      user =>
        user.email !== '' &&
        // user.autho_id !== '' &&
        // user.autho_id !== null &&
        user.password !== null
    )
    .map(user => {
      return {
        uid: user.id,
        email: user.email,
        passwordHash: Buffer.from(user.password),
        displayName: `${user.first_name} ${user.last_name}`,
        // photoURL: user.photo,
      };
    });
  let currentCount = 0;
  while (currentCount < users.length) {
    console.log('importing ' + currentCount + ' out of ' + users.length);
    // eslint-disable-next-line no-await-in-loop
    await firebase.auth.importUsers(
      users.slice(currentCount, (currentCount += 500)),
      {
        hash: {
          algorithm: 'BCRYPT',
        },
      }
    );
  }

  // firebase
  //   .createUsers(users, {
  //     hash: {
  //       algorithm: 'BCRYPT',
  //     },
  //   })
  //   .then(us => {
  //     console.log(JSON.stringify(us));
  //   })
  //   .catch(err => {
  //     console.log(JSON.stringify(err));
  //   });
});
