module.exports = {
  Mutation: {
    saveFCMToken(_, args, context) {
      return context.firebaseCloudMessaging.save({
        ...args,
        customerId: context.auth.id
      });
    },
  }
};
