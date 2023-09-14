const Server = require('../../globals/server');

describe('Tests For Feature Request Handlers', () => {
    let server = null;

    test('List Feature By API', async () => {
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
            url: '/v1/features',
            headers,
            payload: {
                filters: {}
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
            expect(element).toHaveProperty('idFeatureGroup')
        });
    })

    test('List Feature (Specific Feature Group Id) By API', async () => {
        const { app } = server;
      
        let response = await app.inject({
            method: 'POST',
            url: '/v1/feature-groups',
            payload: {
                filters : {  
                    active: true
                }
            }
        })

        let payload  = response.json()

        let featureGroupId = null

        if(payload.data?.length){
            featureGroupId =  payload.data[0].id
        }

        response = await app.inject({
            method: 'POST',
            url: '/v1/features',
            payload: {
                filters : {
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
            expect(element.idFeatureGroup).toEqual(featureGroupId);
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('name')
        });
    })

    test('List (Active with keyword) Feature By API', async () => {
        server = await Server({
            process
        });

        const { app } = server;

        const keyword = "Test Feature"

        const response = await app.inject({
            method: 'POST',
            url: '/v1/features',
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
            expect(element).toHaveProperty('idFeatureGroup')
            expect(element).toHaveProperty('name')
            expect(element.name).toContain(keyword);
        });
    })

    test('Create Feature By API', async () => {        
        const { app, stop } = server;

        let response = await app.inject({
            method: 'POST',
            url: '/v1/feature-groups',
            payload: {
                filters : {
                    active: true  
                } 
            }
        })

        let payload = response.json()

        let featureGroupId = null

        if(payload?.data?.length){
            featureGroupId = payload.data[0].id
        }

        const featureName = `Test Feature ${Math.random(10000,100000)}`;
      
        response = await app.inject({
            method: 'POST',
            url: '/v1/add-feature',
            payload: {
                feature : {
                    id_feature_group: featureGroupId,
                    name: featureName,
                    name_ar: `${featureName} AR`,
                    name_tr: `${featureName} TR`,
                }
            }
        })

        payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');

        expect(payload.data.features_metadata).toBeDefined();

        expect(typeof payload.data.features_metadata).toEqual('object');

        expect(payload.data).toHaveProperty('feature_id')
        payload.data.features_metadata.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('id_feature')
            expect(element).toHaveProperty('id_lang')
            expect(element).toHaveProperty('name')
        });

        const stopped = await stop();

        expect(stopped).toBeTruthy();
    })
});