const { setupAuthContext } = require('../helpers/context-helpers');
// Need to initialize firebase before calling admin
// eslint-disable-next-line no-unused-vars
const { firebase } = require('../lib/firebase');
const admin = require('firebase-admin');

exports.firebaseGetCustomAuthToken = async (req, res) => {
  const context = await setupAuthContext(req);
  if (!context.auth || (!context.auth.uid && !context.auth.id)) {
    console.log('Unauthorized Flow');
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }
  const targetId = context.auth.uid ? context.auth.uid : context.auth.id;
  const customToken = await admin.auth().createCustomToken(targetId);
  if (!customToken) {
    console.log('Error with Created Custom Token');
    return res.status(500).json({
      message: 'An error with custom token creation occurred',
    });
  }
  return res.status(201).json({
    message: 'Custom Token Created',
    customToken,
  });
};
