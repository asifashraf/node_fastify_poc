const otterServices = require('./otter');
const deliverectServices = require('./deliverect');

module.exports = function MenuIntegrationServices(queryContext) {
  return () => ({
    get otter() {
      return otterServices(queryContext);
    },
    get deliverect() {
      return deliverectServices(queryContext);
    },
  });
};
