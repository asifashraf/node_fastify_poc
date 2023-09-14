const network = require('../network');

function MenuIntegrationServices(options) {
  return (serviceName) => ({
    get baseUrl() {
      return options.baseUrl || null;
    },
    get inetwork() {
      return network;
    },
    get name() {
      return serviceName;
    },
    auth: async function auth() {
      throw new Error('Not implemented');
    },
    menuWebhook: async function menuWebhook() {
      throw new Error('Not implemented');
    },
  });
}

module.exports = MenuIntegrationServices;
