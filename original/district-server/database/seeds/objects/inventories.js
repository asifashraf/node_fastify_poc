/* eslint-disable camelcase */

module.exports = (pickupLocations, products) => {
  return {
    inv_1: {
      id: '4302adde-7982-4c26-a4ce-b3034d687330',
      pickup_location_id: pickupLocations.loc_1.id,
      product_id: products.prod_1.id,
      quantity: 10,
    },
    inv_2: {
      id: 'e19d1c73-ef1f-4cdc-841e-ae230a329fb8',
      pickup_location_id: pickupLocations.loc_2.id,
      product_id: products.prod_2.id,
      quantity: 2,
    },
  };
};
