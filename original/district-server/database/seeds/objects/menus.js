/* eslint-disable camelcase */
module.exports = brands => {
  const menus = {
    caribou: {
      id: 'b7a4936a-e6e9-494d-982d-fa8c42a78636',
      brand_id: brands.caribou.id,
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    },
    costa: {
      id: '27146d48-1348-4d1f-8ea5-aab28eeb5d91',
      brand_id: brands.costa.id,
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    },
    starbucks: {
      id: '0dc414ab-b1b3-43b6-9dd7-34c9b05e4ab0',
      brand_id: brands.starbucks.id,
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    },
    emptyMenu: {
      id: '75023e9d-5ab3-4d45-8f07-8970d92d0c31',
      brand_id: brands.noMenuBrand.id,
      country_id: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    },
  };

  return menus;
};
