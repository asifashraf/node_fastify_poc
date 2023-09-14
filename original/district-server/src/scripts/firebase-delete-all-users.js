const firebase = require('../lib/firebase');

firebase.getAllUsers().then(us => {
  console.log(`got ${us.lenght} users !`);
  firebase.deleteUsers(us).then(() => {
    firebase.getAllUsers().then(us => {
      console.log(`finished got ${us.lenght} users !`);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit();
    });
  });
});
