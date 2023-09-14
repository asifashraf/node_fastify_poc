const _fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = function HttpRequest(opts) {
    const { logger } = opts;

    function convertToQueryString({ params }) {
        const keys = Object.keys(params);

        let kvps = keys.map(key => `${key}=${encodeURIComponent(params[key])}`);

        kvps = kvps.join("&");

        return `?${kvps}`;
    }

    async function sendUsingNodeFetch({ path, options, json }) {
        try {

            if (options.body) {

                if(!options.headers['content-type']) {
                    options['body'] = JSON.stringify(options.body || {});
                    options.headers['content-type'] = 'application/json';
                }
            }

            logger.debug(path, `HttpRequest > Request > path >`);
            
            logger.debug(options, `HttpRequest > Request > options >`);

            response = await _fetch(path, options);

            response = await response.text();

            logger.debug(response, `HttpRequest > Response > Body >`);

            if (json) return JSON.parse(response);

            return response;

        } catch (ex) {
            logger.error({ msg: `Exception In > SvcHttpRequest > sendUsingNodeFetch >`, ex });

            throw Error(ex)
        }
    }

    async function send({ path, headers = {}, method, params, pathParams, json }) {
        const options = {
            headers,
            method,
        }

        if (params && method === 'GET') path = `${path}${convertToQueryString({ params })}`;

        if (params && method !== 'GET') options['body'] = params;

        if (pathParams) {
            const { key, value } = pathParams;

            path = `${path.replace(key, value)}`
        }

        return await sendUsingNodeFetch({ path, options, json });
    }

    return {
        send,
    }

}
