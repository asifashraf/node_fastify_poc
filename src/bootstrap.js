const fastify = require('fastify');
const helmet = require('@fastify/helmet');
const fastifyCors = require('@fastify/cors');
const elkLogger = require('pino-elasticsearch');

const multer = require('fastify-multer')

const storage = multer.memoryStorage()

const multerStorage = multer({ storage })

const config = require('./config');
const di = require('./di');
const adapters = require('../adapters');

const errorDecorator = require('../plugins/ErrorDecorator');
const swagger = require('../plugins/Swagger')(config);
const routes = require('../plugins/RouteLoader');


const onRequestHook = require('../hooks/OnRequestHook');
const onPreSerializationHook = require('../hooks/OnPreSerialization');

const { isDev, isSwagger } = config;

module.exports = async function FastServer(options) {
    const process = options.process;

    let userOptions = options.options;

    if (userOptions === undefined) userOptions = {};

    if (process === null) throw new Error('FastServer is dependent on [process]');

    const defaultOptions = {
        bodyLimit: (1048576 * 8),
        logger: {
            level: config.logLevel,
            serializers: {
                req(req) {
                    return {
                        method: req.method,
                        url: req.url,
                        path: req.path,
                        parameters: req.parameters,
                        headers: req.headers
                    }
                }
            }
        }
    };

    let _server = null;
    let _elkLogger = null;
    if (config.isProd) {
        _elkLogger = await elkLogger({
            host: config.elk.host,
            index: `ecom-product-${config.env}`,
            user: config.elk.user,
            password: config.elk.password,
            port: config.elk.port,
        });
    }
    if (config.isProd) {
        defaultOptions.logger['stream'] = _elkLogger;
    }

    const serverOptions = { ...defaultOptions, ...userOptions };

    if (_server === null) _server = fastify(serverOptions);

    const _di = await di({
        logger: _server.log,
        config
    });

    const _container = await _di._container();

    const _adapters = await adapters(_container.cradle);

    await _di.register('db', _adapters.db, true);
    await _di.register('cache', _adapters.cache, true);
    await _di.register('multerStorage', multerStorage, true);

    await _server.decorate('di', () => _container);

    await _server.decorateRequest('pagination', null);

    await _server.decorateRequest('i8ln', null)

    _server.setValidatorCompiler(({ schema }) => data => schema.validate(data));

    await _server.addHook('onRequest', onRequestHook)
    await _server.addHook('preSerialization', onPreSerializationHook);

    let prefix = config.apiPrefix;

    await _server.register(helmet);
    await _server.register(fastifyCors);
    await _server.register(errorDecorator);
    await _server.register(multer.contentParser);

    if (isSwagger) {
        await _server.register(swagger.module, swagger.options);
    }

    const { initializationMediator } = _container.cradle;

    await initializationMediator.init();

    await _server.register(routes, { prefix });

    const start = async function start() {
        try {

            await _server.listen({
                port: config.port,
                host: config.host,
            });

        } catch (ex) {
            console.error("Server Startup Exception > Abrupt Shut Down >", ex);
            process.exit(1);
        }
    };

    const stop = async function stop() {
        try {

            const { db, cache } = _server.di().cradle;

            await db.primary.destroy();
            await cache.primary.quit();

            await _server.close();

            return true;

        } catch (ex) {
            console.error("Server Shutdown Exception > Abrupt Shut Down >", ex);
            process.exit(1);
        }
    }

    return {
        app: _server,
        start,
        stop,
    };
}
