const Server = require('../../globals/server');

describe('Tests For Categories Request Handlers', () => {
    let server = null;

    test('List Category By API', async () => {
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
            url: '/v1/categories',
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
            expect(element).toHaveProperty('description')
            expect(element).toHaveProperty('icon_url')
        });
    })

    test('List Category Filters By API', async () => {
        const { app } = server;

        const response = await app.inject({
            method: 'POST',
            url: '/v1/filters-by-category',
            payload: {
                filters: {
                    id_category: "29bf9623-4722-43d5-bb76-1ed4791fe0ff",
                    prices: {
                        min_price: 10,
                        max_price: 105
                    }
                }
            }
        })

        const payload = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data.brands).toBeDefined()   
        expect(typeof payload.data.brands).toEqual('object');

        payload.data.brands.forEach(element => {
            expect(element).toHaveProperty('id_manufacturer')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('image_url')
            expect(element).toHaveProperty('product_count')
            expect(element).toHaveProperty('selected')
        });
    })

    test('Create Category By API', async () => {
        const { app, stop } = server;

        const categoryName = `test category ${Math.random(10000,100000)}`;

        const response = await app.inject({
            method: 'POST',
            url: '/v1/add-category',
            payload: {
                category: {
                    name: categoryName,
                    name_ar: `${categoryName} AR`,
                    name_tr: `${categoryName} TR`,
                    description: `Unit test testing category creation`,
                    description_ar: `Unit test testing category creation AR`,
                    description_tr: `Unit test testing category creation TR`,
                    id_parent: '0facccb7-77e8-4bd1-b3b6-351cbc21dd9c',
                }
            }
        })

        const payload = response.json()

        expect(response.statusCode).toEqual(200);

        expect(payload.data).toBeDefined();
        expect(typeof payload.data).toEqual('object');

        expect(payload.data.category_metadata).toBeDefined();
        expect(typeof payload.data.category_metadata).toEqual('object');

        expect(payload.data).toHaveProperty('category_id')
        payload.data.category_metadata.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('id_category')
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