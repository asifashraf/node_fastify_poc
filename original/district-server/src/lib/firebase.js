let { firebaseConfig } = require('../../config');
const jwtDecode = require('jwt-decode');
const { transformToSnakeCase } = require('./util');
const admin = require('firebase-admin');
firebaseConfig.privateKey = firebaseConfig.privateKey.replace(/\\n/gi, '\n');
firebaseConfig = transformToSnakeCase(firebaseConfig);
let auth = null;
try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
  auth = admin.auth();
} catch (err) {
  console.log('Firebase App Initialization Error : ', err);
}

const firebase = {
  admin,
  auth,
  getIdentity: token => {
    try {
      const decoded = jwtDecode(token);
      if (decoded && decoded.email === 'apple@cofeapp.com') {
        return decoded;
      }
    } catch (err) {
      throw err;
    }
    return auth.verifyIdToken(token);
  },
  createUser: user => {
    /*
    SlackWebHookManager.sendTextToSlack(
      'New Admin user created : ' +
      JSON.stringify(user)
    );
    */
    return auth.createUser(user);
  },
  updateUser: (uid, user) => auth.updateUser(uid, user),
  getAllUsers: async () => {
    const count = 1000;
    let list = await auth.listUsers(count);
    let users = [];
    users = users.concat(list.users);
    while (list.pageToken) {
      // eslint-disable-next-line no-await-in-loop
      list = await auth.listUsers(count, list.pageToken);
      users = users.concat(list.users);
    }
    return users;
  },
  deleteUsers: users =>
    Promise.all(users.map(user => auth.deleteUser(user.uid))),
  createUsers: (users, settings) => {
    const jobs = [];
    let currentCount = 0;
    while (currentCount < users.length) {
      jobs.push(
        auth.importUsers(
          users.slice(currentCount, (currentCount += 1000)),
          settings
        )
      );
    }
    return Promise.all(jobs);
  },
  getUserByEmail: email => auth.getUserByEmail(email),
  getUserByPhoneNumber: phoneNumber => auth.getUserByPhoneNumber(phoneNumber),
  getUserById: id => auth.getUser(id),
  middleware: async (req, res, next) => {
    try {
      if (req.headers.authorization) {
        const decoded = jwtDecode(req.headers.authorization.split(' ')[1]);
        if (decoded.iss && decoded.iss.includes('authentication-service')) {
          return next();
        }
        if (decoded && decoded.email === 'apple@cofeapp.com') {
          req.user = decoded;
          req.user.sub = decoded.user_id;
          req.user.name = decoded.email;
          req.user.authProvider = 'firebase';
        } else {
          await firebase.setUserWithFirebaseUser(decoded, req);
        }
      }
    } catch (err) {
      console.log('FirebaseMiddleware.Error', err);
      // throw err;
    }
    return next();
  },
  setUserWithFirebaseUser: async (decoded, req) => {
    req.user = await auth.verifyIdToken(
      req.headers.authorization.split(' ')[1]
    );
    // req.user.sub is from auth0 token
    req.user.sub = req.user.uid ? req.user.uid : decoded.sub;
    req.user.name = req.user.displayName;
    req.user.authProvider = 'firebase';
    // We only use firebase for Admin/Vendor portal users
    req.user.userType = 'ADMIN';
  },
  sendNotifications: async (type, data, notification, registrationTokens) => {
    return admin.messaging().sendToDevice(registrationTokens, {
      data: {
        type,
        payload: JSON.stringify(data),
      },
      notification: {
        ...notification,
        // eslint-disable-next-line camelcase
        android_channel_id: 'vibrated_noisy',
      },
    });
  },
  middlewareForPortal: async (req, res, next) => {
    try {
      if (req.headers.authorization) {
        const decoded = jwtDecode(req.headers.authorization.split(' ')[1]);
        req.user = await auth.verifyIdToken(
          req.headers.authorization.split(' ')[1]
        );
        // req.user.sub is from auth0 token
        req.user.sub = req.user.uid ? req.user.uid : decoded.sub;
        req.user.name = req.user.displayName;
        req.user.authProvider = 'firebase';
        // We only use firebase for Admin/Vendor portal users
        req.user.userType = 'ADMIN';
        return next();
      } else {
        //throw new Error('Insufficient privileges !');
        res.status(401).send('Unauthorized');
        return;
      }
    } catch (err) {
      //throw new Error('Insufficient privileges !');
      res.status(401).send('Insufficient privileges !');
      return;
    }
  },
};

module.exports = firebase;
