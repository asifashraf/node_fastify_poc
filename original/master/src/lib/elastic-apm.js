const {
   apm,
   env,
} = require('../../config');

let _apm = null;

if (apm.enabled) {
    console.info(`Initializing APM >`, {
        serviceName: apm.serviceName,
        serverUrl: apm.serverUrl, 
        environment: env
    });
    
    _apm = require('elastic-apm-node').start({
        serviceName: apm.serviceName,
        serverUrl: apm.serverUrl, 
        environment: env
    });
}