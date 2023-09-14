const awilix = require('awilix');
const Joi = require('joi');
const Boom = require('@hapi/boom');
const NestHydrationJS = require('nesthydrationjs')();
const moment = require("moment");
const AWS = require('aws-sdk');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const QRCode = require('qrcode');
const formData = require('form-data');
const momentTz = require("moment-timezone");
const queue = require('bull');
const jsonexport = require('jsonexport');
const nodeCron = require('node-cron');

const _ = require('lodash');
const path = require('path');

const i18n = require('../globals/i18n');

const container = awilix.createContainer();

module.exports = async function FastDI(options = {}) {

    const logger = _.get(options, 'logger', undefined);
    const config = _.get(options, 'config', undefined);

    if (logger === undefined) throw new Error('FastDI is dependent on [logger] instance');

    if (config === undefined) throw new Error('FastDI is dependent on [config] instance');

    container.register({
        config: awilix.asValue(config),
        logger: awilix.asValue(logger),
        Joi: awilix.asValue(Joi),
        Boom: awilix.asValue(Boom),
        knexnest: awilix.asValue(NestHydrationJS),
        _: awilix.asValue(_),
        path: awilix.asValue(path),
        moment: awilix.asValue(moment),
        momentTz: awilix.asValue(momentTz),
        Aws: awilix.asValue(AWS),
        puppeteer: awilix.asValue(puppeteer),
        handlebars: awilix.asValue(handlebars),
        fs: awilix.asValue(fs),
        QRCode: awilix.asValue(QRCode),
        formData: awilix.asValue(formData),
        i18n: awilix.asValue(i18n),
        Bull: awilix.asValue(queue),
        jsonexport: awilix.asValue(jsonexport),
        nodeCron: awilix.asValue(nodeCron)
    });

    container.loadModules(
        [
            '../models/*.js',
            '../services/*.js',
            '../helpers/*.js',
            '../schema/*.js',
            '../schema/params/*.js',
            '../schema/*.js',
            '../handlers/*.js',
            '../mediators/*.js',
            '../decorators/*.js',
            '../schema/headers/*.js',
        ],
        {
            cwd: __dirname,
            formatName: 'camelCase',
            resolverOptions: {
                lifetime: awilix.Lifetime.SINGLETON,
                register: awilix.asFunction,
            },
        },
    );

    const _container = async () => container;

    const register = async (type, value) => {
        switch (type) {
            case 'db':
                container.register('db', awilix.asFunction(() => value).singleton());
                break;
            case 'cache':
                container.register('cache', awilix.asFunction(() => value).singleton());
                break;
            case 'queue':
                container.register('queue', awilix.asFunction(() => value).singleton());
                break;
            case 'multerStorage':
                container.register('multerStorage', awilix.asFunction(() => value).singleton());
                break;
        }
    }

    return {
        _container,
        register,
    }

}
