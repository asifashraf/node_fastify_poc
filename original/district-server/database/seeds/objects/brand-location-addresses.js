/* eslint-disable camelcase */
module.exports = (brandLocations, knex) => {
  const brandLocationAddresses = {
    caribou1: {
      id: '5df99856-652a-4944-9471-5a7438d71243',
      brand_location_id: brandLocations.caribou1.id,
      short_address: 'Al-Raya Shopping',
      short_address_ar: 'الراية للتسوق',
      street: 'Al-Raya Shopping Center Al-Shuhada Street',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.990362600000026 29.3774796)', 4326)`
      ),
      neighborhood_id: 'cb56745a-a8b2-4a1a-a499-10bbe37d9dff',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    caribou2: {
      id: '52decbff-6063-4813-8a0d-d77c17a32a1b',
      brand_location_id: brandLocations.caribou2.id,
      short_address: 'Khalid',
      short_address_ar: 'خالد',
      street: 'Khalid Ibn Al Waleed St',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.9842539 29.37856)', 4326)`
      ),
      neighborhood_id: '60ddce4c-9710-4999-827c-6b5b554c61e6',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    caribou3: {
      id: '7e5c2cbe-bce3-438d-8d28-fdc928eb59d3',
      brand_location_id: brandLocations.caribou3.id,
      short_address: 'Global Investment',
      short_address_ar: 'الاستثمار العالمي',
      street: 'Global Investment Al-Shuhada Street',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.98820449999994 29.3754443)', 4326)`
      ),
      neighborhood_id: 'ea598d51-7bdf-4e97-8e2a-1e59daeb605b',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    costa1: {
      id: '8bed2a01-1e20-4c27-a475-3f71dd6d0875',
      brand_location_id: brandLocations.costa1.id,
      short_address: 'Al-Shuhada',
      short_address_ar: 'الشهداء',
      street: 'Al-Shuhada St',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.989675499999976 29.3774545)', 4326)`
      ),
      neighborhood_id: 'cb56745a-a8b2-4a1a-a499-10bbe37d9dff',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    costa2: {
      id: 'b1b4c666-f2ed-4839-a690-e0915b1b1849',
      brand_location_id: brandLocations.costa2.id,
      short_address: 'The Sultan',
      short_address_ar: 'السلطان',
      street: 'The Sultan Center',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.98029599999995 29.388603)', 4326)`
      ),
      neighborhood_id: '83ee1216-26fe-48e3-a3d1-a0f2a2092407',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    costa3: {
      id: 'e2eba019-1cf4-4b45-a5ab-13196dfde707',
      brand_location_id: brandLocations.costa3.id,
      short_address: 'Avenues ',
      short_address_ar: 'الأفنيوز ',
      street: 'Avenues 1414',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.934973000000014 29.302099)', 4326)`
      ),
      neighborhood_id: 'cb56745a-a8b2-4a1a-a499-10bbe37d9dff',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    starbucks1: {
      id: '5f2a82ae-9b3e-4003-8970-9224377c9ef7',
      brand_location_id: brandLocations.starbucks1.id,
      short_address: 'Starbucks 1',
      short_address_ar: 'ستاربكس 1',
      street: 'Baitak Tower, Ahmad Al Jaber St',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.97487049999995 29.3712177)', 4326)`
      ),
      neighborhood_id: '0d0430d3-eebb-47db-ac7c-d3f31e3761e8',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    starbucks2: {
      id: '85573091-6d8e-40e0-9f2b-2be6fc0e470f',
      brand_location_id: brandLocations.starbucks2.id,
      short_address: 'Starbucks 2',
      short_address_ar: 'ستاربكس 2',
      street: 'Four Points Sheraton',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.96275200000002 29.361634)', 4326)`
      ),
      neighborhood_id: '77f37047-b4a2-43fc-b4ca-b95597412582',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    starbucks3: {
      id: 'd2604d5b-79db-4f34-8696-89506c2839c3',
      brand_location_id: brandLocations.starbucks3.id,
      short_address: 'Starbucks 3',
      short_address_ar: 'ستاربكس 3',
      street: 'Al Hamra Tower',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.99328790000004 29.3790539)', 4326)`
      ),
      neighborhood_id: '83ee1216-26fe-48e3-a3d1-a0f2a2092407',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
    NoMenuLocation: {
      id: '17ae5324-e783-44d5-9035-91db8d6c3d4a',
      brand_location_id: brandLocations.NoMenuLocation.id,
      short_address: 'No-Menu Location',
      short_address_ar: 'لا القائمة الموقع',
      street: 'Al Hamra Tower',
      city: 'Kuwait City',
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.99328790000004 29.3790539)', 4326)`
      ),
      neighborhood_id: '77f37047-b4a2-43fc-b4ca-b95597412582',
      city_id: 'ef0d6b57-0b6f-4722-a36b-c8a2e0bbb41e',
    },
  };

  return brandLocationAddresses;
};
