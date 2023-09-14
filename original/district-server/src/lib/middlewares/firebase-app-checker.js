module.exports = (firebase) => {
  const firebaseAppChecker = async (req, res, next) => {
    const appCheckToken = req.header('Identity-Token');

    if (!appCheckToken) {
      // this scope will be activated after mobile implementation
      // res.status(401);
      // return next('Unauthorized');
      return next();
    }

    try {
      await firebase.appCheck().verifyToken(appCheckToken);

      return next();
    } catch (err) {
      res.status(401);
      return next('Unauthorized');
    }
  };

  return firebaseAppChecker;
};
