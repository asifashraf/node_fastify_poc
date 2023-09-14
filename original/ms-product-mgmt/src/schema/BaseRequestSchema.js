module.exports = function BaseRequestSchema(opts) {
    return function (handlerName, routeInfo) {
        const { Boom } = opts;

        const handlers = opts[handlerName];

        const routes = Object.keys(handlers);

        const notAHandle = ['di', 'name'];

        const _handles = {};

        routes.forEach(route => {
            if (!notAHandle.includes(route)) {
                if (routeInfo[route]) {
                    const info = routeInfo[route];

                    if(!info.hasOwnProperty('url')) throw Boom.badRequest(`Unable to find url in route info for route [${route}]`);
                    if (!info.hasOwnProperty('method')) throw Boom.badRequest(`Unable to find method in route info for route [${route}]`);
    
                    _handles[route] = {
                        ...info,
                        handler: handlers[route]
                    }
                }
            }
        })

        return _handles;
    }
}