const _fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = (function HttpRequest() {
  function convertToQueryString({ params }) {
    const keys = Object.keys(params);

    let kvps = keys.map((key) => `${key}=${encodeURIComponent(params[key])}`);

    kvps = kvps.join('&');

    return `?${kvps}`;
  }

  async function sendUsingNodeFetch({ path, options, json }) {
    try {
      if (options.body) {
        options['body'] = JSON.stringify(options.body || {});

        options.headers['Content-Type'] = 'application/json';
      }

      const response = await _fetch(path, options);

      if (json) return await response.json();

      return response;
    } catch (ex) {
      console.error({
        msg: `Exception In > HttpRequest > sendUsingNodeFetch >`,
        ex,
      });

      throw Error(ex);
    }
  }

  async function send({ path, headers, method, params, pathParams, json }) {
    const options = {
      headers,
      method,
    };

    if (params && method === 'GET')
      path = `${path}${convertToQueryString({ params })}`;

    if (params && method !== 'GET') options['body'] = params;

    if (pathParams) {
      const { key, value } = pathParams;

      path = `${path.replace(key, value)}`;
    }

    return await sendUsingNodeFetch({ path, options, json });
  }

  return {
    send,
  };
})();
