/* eslint-disable camelcase */

module.exports = (brands, neighborhoods, knex) => {
  return {
    loc_1: {
      id: '854d3e7b-726a-4b8c-8be6-5e3a1899f5d6',
      brand_id: brands.caribou.id,
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.990362600000026 29.3774796)', 4326)`
      ),
      name: 'pickup loc 1',
      city_id: neighborhoods[0].city_id,
      neighborhood_id: neighborhoods[0].id,
      street: 'street loc 1',
      manager_name: 'Manager name loc 1',
      manager_email: 'Manager email loc 1',
      manager_phone: 'Manager phone loc 1',
    },
    loc_2: {
      id: 'd7c08794-1662-4f57-b9dd-00bb29a6c9aa',
      brand_id: brands.caribou.id,
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.9842539 29.37856)', 4326)`
      ),
      name: 'pickup loc 2',
      city_id: neighborhoods[1].city_id,
      neighborhood_id: neighborhoods[1].id,
      street: 'street loc 2',
      manager_name: 'Manager name loc 2',
      manager_email: 'Manager email loc 2',
      manager_phone: 'Manager phone loc 2',
    },
    loc_3: {
      id: 'f2810145-af11-4efe-939e-a6ef309fd5c2',
      brand_id: brands.costa.id,
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.989675499999976 29.3774545)', 4326)`
      ),
      name: 'pickup loc 3',
      city_id: neighborhoods[2].city_id,
      neighborhood_id: neighborhoods[2].id,
      street: 'street loc 3',
      manager_name: 'Manager name loc 3',
      manager_email: 'Manager email loc 3',
      manager_phone: 'Manager phone loc 3',
    },
    loc_4: {
      id: 'b50995af-15b6-4fc5-beaf-937a2ed0fec3',
      brand_id: brands.costa.id,
      geolocation: knex.raw(
        `ST_GeomFromText('POINT(47.98029599999995 29.388603)', 4326)`
      ),
      name: 'pickup loc 4',
      city_id: neighborhoods[3].city_id,
      neighborhood_id: neighborhoods[3].id,
      street: 'street loc 4',
      manager_name: 'Manager name loc 4',
      manager_email: 'Manager email loc 4',
      manager_phone: 'Manager phone loc 4',
    },
  };
};
