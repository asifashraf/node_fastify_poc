const Axios = require('axios');
const axios = Axios.create({
  timeout: 60000,
  headers: { 'content-type': 'application/json' },
});

module.exports = (function AxiosHttp() {
  return {
    send: async function ({ path, params }) {
      return await axios.post(path, params);
    },
  };
})();
