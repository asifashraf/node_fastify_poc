const Server = require('../../globals/server');

describe('Tests For Feature Values Request Handlers', () => {
    let server = null;

    test('List Feature Values By API', async () => {
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
            url: '/v1/feature-values',
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
            expect(element).toHaveProperty('idFeature')
        });
    })

    test('Create Feature Values By API', async () => {        
        const { app } = server;

        const randomNumber = Math.random(10000,100000)

        const featureGroupName = `Test Feature Group ${randomNumber}`;

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

        let payload = response.json()

        let featureGroupId = null

        if(payload?.data){
            featureGroupId = payload.data.feature_group_id
        }

        const featureName = `Test Feature ${randomNumber}`;
      
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

        let featureId = null

        if(payload?.data){
            featureId = payload.data.feature_id
        }

        const featureValueName = `Test Feature Value ${randomNumber}`;
      
        response = await app.inject({
            method: 'POST',
            url: '/v1/add-feature-value',
            payload: {
                featureValue : {
                    id_feature: featureId,
                    name: featureValueName,
                    name_ar: `${featureValueName} AR`,
                    name_tr: `${featureValueName} TR`,
                }
            }
        })

        payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');

        expect(payload.data.feature_value_metadata).toBeDefined();

        expect(typeof payload.data.feature_value_metadata).toEqual('object');

        expect(payload.data).toHaveProperty('feature_value_id')
        payload.data.feature_value_metadata.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('id_feature_value')
            expect(element).toHaveProperty('id_lang')
            expect(element).toHaveProperty('name')
        });
    })

    test('List (With keyword) Feature Values By API', async () => {
        const { app, stop } = server;

        const keyword = "Test Feature Value"

        const response = await app.inject({
            method: 'POST',
            url: '/v1/feature-values',
            payload: {
                filters : {
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
            expect(element).toHaveProperty('idFeature')
            expect(element).toHaveProperty('name')
            expect(element.name).toContain(keyword);
        });

        const stopped = await stop();

        expect(stopped).toBeTruthy();
    })
});