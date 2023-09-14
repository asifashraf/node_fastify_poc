const Server = require('../server');

describe('Test Server Initialization & Bootup', () => {
    test('Should return server object and a 200 response', async () => {
        let server = null;

        server = await Server({
            process
        });

        const { app, start, stop } = server;

        expect(app).toBeDefined();
        expect(start).toBeDefined();

        const response = await app.inject({
            method: 'GET',
            url: '/v1/health'
        })

        expect(response.statusCode).toEqual(200);

        const stopped = await stop();

        expect(stopped).toBeTruthy();
    })
})