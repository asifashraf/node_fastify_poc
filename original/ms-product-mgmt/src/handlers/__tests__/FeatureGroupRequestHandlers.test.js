const Server = require('../../globals/server');

describe('Tests For Feature Group Request Handlers', () => {
    let server = null;

    test('List (Active) Feature Group By API', async () => {
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
            url: '/v1/feature-groups',
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
            expect(element).toHaveProperty('status')
        });
    })

    test('List (Active with specific id) Feature Group By API', async () => {
        server = await Server({
            process
        });

        const { app } = server;

        const featureGroupName = `Test Feature Group ${Math.random(10000,100000)}`;
      
        let response = await app.inject({
            method: 'POST',
            url: '/v1/add-feature-group',
            payload: {
                featureGroup : {
                    name: featureGroupName,
                    name_ar: `${featureGroupName} AR`,
                    name_tr: `${featureGroupName} TR`,
                }
            }
        })

        let payload  = response.json()

        const { feature_group_id: featureGroupId } = payload.data

        response = await app.inject({
            method: 'POST',
            url: '/v1/feature-groups',
            payload: {
                filters : {
                    active: true,
                    id_feature_group: [
                       featureGroupId
                    ]
                } 
            }
        })

        payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');

        payload.data.forEach(element => {
            expect(element.id).toEqual(featureGroupId);
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('status')
        });
    })

    test('List (Active with keyword) Feature Group By API', async () => {
        server = await Server({
            process
        });

        const { app } = server;

        const keyword = 'Feature Group'

        const response = await app.inject({
            method: 'POST',
            url: '/v1/feature-groups',
            payload: {
                filters : {
                    active: true,
                    keyword
                } 
            }
        })

        const payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');

        payload.data?.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('status')
            expect(element.name).toContain(keyword);
        });
    })

    test('Create Feature Group By API', async () => {
        const { app, stop } = server;

        const featureGroupName = `Test Feature Group ${Math.random(10000,100000)}`;
      
        const response = await app.inject({
            method: 'POST',
            url: '/v1/add-feature-group',
            payload: {
                featureGroup : {
                    name: featureGroupName,
                    name_ar: `${featureGroupName} AR`,
                    name_tr: `${featureGroupName} TR`,
                }
            }
        })

        const payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');

        expect(payload.data.feature_group_metadata).toBeDefined();

        expect(typeof payload.data.feature_group_metadata).toEqual('object');

        expect(payload.data).toHaveProperty('feature_group_id')
        payload.data.feature_group_metadata.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('id_feature_group')
            expect(element).toHaveProperty('id_lang')
            expect(element).toHaveProperty('name')
        });

        const stopped = await stop();

        expect(stopped).toBeTruthy();
    })
});