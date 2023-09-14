const Server = require('../../globals/server');

describe('Tests For Manufacturer Request Handlers', () => {
    let server = null;

    test('List Manufacturer By API', async () => {
        server = await Server({
            process
        });

        const { app } = server;

        const headers = {
            pagination: true,
            'per-page': 5,
        }

        const response = await app.inject({
            method: 'POST',
            url: '/v1/manufacturers',
            headers,
            payload: {
                filters : {
                    active: true  
                } 
            }
        })

        const payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');
        expect(payload.data.length).toBeLessThanOrEqual(headers['per-page'])

        payload.data.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('image_url')
        });
    })

    test('Create Manufacturer By API', async () => {
        const { app, stop } = server;

        const manufacturerName = `Test Manufacturer ${Math.random(10000,100000)}`;

        const response = await app.inject({
            method: 'POST',
            url: '/v1/add-manufacturer',
            payload: {
                manufacturer : {
                    name: manufacturerName,
                    name_ar: `${manufacturerName} AR`,
                    name_tr: `${manufacturerName} TR`,
                }
            }
        })

        const payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');

        expect(payload.data.manufacturer_metadata).toBeDefined();

        expect(typeof payload.data.manufacturer_metadata).toEqual('object');

        expect(payload.data).toHaveProperty('manufacturer_id')
        payload.data.manufacturer_metadata.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('id_manufacturer')
            expect(element).toHaveProperty('id_lang')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('description')
            expect(element).toHaveProperty('meta_title')
            expect(element).toHaveProperty('meta_keywords')
            expect(element).toHaveProperty('meta_description')
        });

        const stopped = await stop();

        expect(stopped).toBeTruthy();
    })
});