const _fetch = require('axios').default;
function AxiosAdapter() {
  function convertToQueryString({ params }) {
    const keys = Object.keys(params);
    let kvps = keys.map(key => `${key}=${encodeURIComponent(params[key])}`);
    kvps = kvps.join('&');
    return `?${kvps}`;
  }
  async function sendUsingAxios({ path, options, json }) {
    try {
      return await _fetch.post(path, options.body, {
        headers: options.headers
      });
    } catch (ex) {
      throw Error(ex);
    }
  }
  async function send({ path, headers, method, params, pathParams, json }) {
    const options = {
      headers,
      method,
    };
    if (params && method === 'GET') path = `${path}${convertToQueryString({ params })}`;
    if (params && method !== 'GET') options['body'] = params;
    if (pathParams) {
      const { key, value } = pathParams;
      path = `${path.replace(key, value)}`;
    }
    return await sendUsingAxios({ path, options, json });
  }
  return {
    send,
  };
}

module.exports = AxiosAdapter();
