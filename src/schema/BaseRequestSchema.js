module.exports = function BaseRequestSchema(opts) {
    return function (handlerName, routeInfo) {
        const { Boom } = opts;

        const handlers = opts[handlerName];

        const routes = Object.keys(handlers);

        const excludedHandle = ['di', 'name'];

        const _handles = {};

        let atLeastOneRouteFound = false;
        routes.forEach(route => {
            let isExcluded = excludedHandle.includes(route);
            if (!isExcluded) {
                if (routeInfo[route]) {
                    atLeastOneRouteFound = true;
                    const info = routeInfo[route];
                    if(!info.hasOwnProperty('url')) throw Boom.badRequest(`Unable to find url in route info for route [${route}]`);
                    if (!info.hasOwnProperty('method')) throw Boom.badRequest(`Unable to find method in route info for route [${route}]`);
                    _handles[route] = {
                        ...info,
                        handler: handlers[route]
                    }
                }
            }
        });
        if(!atLeastOneRouteFound){
            console.log(`No matching route found in ${handlerName}, routes should be in ${routes} and not in ${excludedHandle} - (src/schema/BaseRequestSchema.js)`);
        }

        return _handles;
    }
}
