const Server = require('../../globals/server');

describe('Tests For Product Request Handlers', () => {
    let server = null;

    test('Create Product By API', async () => {
        server = await Server({
            process
        });

        const { app } = server;

        const productName = `Test Product ${Math.random(10000,100000)}`;

        const product = {
            name: productName,
            name_ar: `${productName} AR`,
            name_tr: `${productName} TR`,
            short_description: `${productName} Short Description`,
            short_description_ar: `${productName} Short Description in Arabic`,
            short_description_tr: `${productName} Short Description in Turkish`,
            reference: `${productName} Reference`,
            id_manufacturer: "9dea356b-201e-45b4-8a5f-139a08dba2af",
            id_category: "030bdf09-57e2-440e-8516-51f631183eb7",
            quantity: 100,
            id_supplier: "20f57561-dabd-40b3-8ea8-7f4193b615d4",
            price: 40,
            features: [
                {
                    id_feature: "608f9e19-9ee6-4a21-9237-ad08ab6598e4",
                    id_feature_value: "99bab7f3-71c2-47e4-b8e3-66cadac4fec0",
                    id_feature_group: "d68cd46f-3044-449e-9818-0ee7d741d11f"
                }
            ],
            images:  [
                {
                    id_image: "00d1d52c-c970-468d-9164-b67ec917bb5f",
                    position: 1,
                    cover: true
                },
                {
                    id_image: "00d1d52c-c970-468d-9164-b67ec917bb5f",
                    position: 1,
                    cover: false
                }
            ],
        }

        const response = await app.inject({
            method: 'POST',
            url: '/v1/add-product',
            payload: {
               product
            }
        })

        const payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');

        expect(payload.data.product_metadata).toBeDefined();

        expect(typeof payload.data.product_metadata).toEqual('object');

        expect(payload.data).toHaveProperty('product_id')
        payload.data.product_metadata.forEach(element => {
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('id_product')
            expect(element).toHaveProperty('id_lang')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('short_description')
            expect(element).toHaveProperty('description')
            expect(element).toHaveProperty('meta_title')
            expect(element).toHaveProperty('meta_keywords')
            expect(element).toHaveProperty('meta_description')
        });

    })

    test('List Product Details By API', async () => {
        const { app } = server;

        const headers = {
            pagination: true,
            'per-page': 5,
        }

        const response = await app.inject({
            method: 'POST',
            url: '/v1/products',
            headers,
            payload: {
                filters: {
                    active : true
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
            expect(element).toHaveProperty('price')
            expect(element).toHaveProperty('idSupplier')
            expect(element).toHaveProperty('reference')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('manufacturer')
            expect(element).toHaveProperty('shortDescription')
            expect(element).toHaveProperty('product_image')
            expect(element).toHaveProperty('reduction_price')
            expect(element).toHaveProperty('final_price')
        });
    })

    test('List Product Details (Specific Id) By API', async () => {
        const { app } = server;

        const productId = "0c4e2fe7-0b9a-48c7-8408-db414c1749dd"

        const response = await app.inject({
            method: 'POST',
            url: '/v1/products',
            payload: {
                filters: {
                    active : true,
                    id_product : [productId]
                }
            }
        })

        const payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');
        expect(payload.data.length).toEqual(1)

        payload.data.forEach(element => {
            expect(element.id).toEqual(productId)
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('price')
            expect(element).toHaveProperty('idSupplier')
            expect(element).toHaveProperty('reference')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('manufacturer')
            expect(element).toHaveProperty('shortDescription')
            expect(element).toHaveProperty('product_image')
            expect(element).toHaveProperty('reduction_price')
            expect(element).toHaveProperty('final_price')
        });
    })

    test('View Specific Product Details By API', async () => {
        const { app, stop } = server;

        const productId = "9f6f7f2d-66d1-4f2b-9e47-fbc1f7797b70"

        const response = await app.inject({
            method: 'GET',
            url: `/v1/product/${productId}`,
        })

        const payload  = response.json()

        expect(response.statusCode).toEqual(200);
        expect(payload.data).toBeDefined()   
        expect(typeof payload.data).toEqual('object');
        expect(payload.data.length).toEqual(1)

        payload.data.forEach(element => {
            expect(element.id).toEqual(productId)
            expect(element).toHaveProperty('id')
            expect(element).toHaveProperty('price')
            expect(element).toHaveProperty('idSupplier')
            expect(element).toHaveProperty('reference')
            expect(element).toHaveProperty('name')
            expect(element).toHaveProperty('manufacturer')
            expect(element).toHaveProperty('shortDescription')
            expect(element).toHaveProperty('description')
            expect(element).toHaveProperty('quantity')
            expect(element).toHaveProperty('allowBackOrder')
            expect(element).toHaveProperty('categoryName')
            expect(element).toHaveProperty('images')
            expect(element).toHaveProperty('features')
            expect(element).toHaveProperty('reduction_price')
            expect(element).toHaveProperty('final_price')
            expect(element).toHaveProperty('availbleForOrder')
            expect(element).toHaveProperty('productAttributes')
        });

        const stopped = await stop();

        expect(stopped).toBeTruthy();
    })
});