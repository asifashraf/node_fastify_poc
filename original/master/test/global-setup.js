// The purpose of this file is to run once before all tests run
// It checks to see if we should reset the test database first.
// This is based on whether there are changes currently in git which match database files,
// or if a local cached SHA has changed indicating a branch may have changed.
const {
  checkForRecentDatabaseChanges,
  checkForTestShaCache,
  reset,
} = require('./global-setup-util');

function resetDb() {
  return Promise.all([checkForRecentDatabaseChanges(), checkForTestShaCache()])
    .then(([dbWork, newSha]) => {
      console.log({ dbWork, newSha });
      if (dbWork || newSha) {
        return reset();
      }
    })
    .catch(err => console.log(err));
}

module.exports = resetDb;
