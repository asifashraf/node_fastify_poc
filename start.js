const FastServer = require('./src/bootstrap');

(async (process) => {

    let server = null;

    try {

        server = await FastServer({
            process
        });

        await server.start();
    } catch (_error) {
        console.error("Fatal Error In Bootstrap > ", _error);
        process.exit(1);
    }

    //Graceful termination
    process.on('SIGINT', async () => {
        server.app.log.info('Stopping server...');

        await server.stop();

        server.app.log.info('Server has stopped');

        process.exit(0);
    });

    return {
        server
    }
})();
