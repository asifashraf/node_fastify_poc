/* eslint-disable camelcase */
const casual = require('casual');

module.exports = customers => {
  const cars = [
    {
      name: 'Bourgie Ride',
      is_default: true,
      color: 'Silver',
      brand: 'Maserati',
      plate_number: 'DEEZNUTZ',
      note: 'This is a note, there are many like me. . . ',
    },
    {
      name: 'Bitchin Camaro',
      is_default: false,
      color: 'Black',
      brand: 'Chevy Camaro',
      plate_number: 'BITCHNB',
      note: 'Dont forget your Motley Crüe T-shirt!',
    },
  ];
  const customerCars = [];
  customers.forEach(customer => {
    // bourgie ride
    customerCars.push({
      ...cars[0],
      id: casual.uuid,
      customer_id: customer.id,
    });

    // bitchin camaro
    customerCars.push({
      ...cars[1],
      id: casual.uuid,
      customer_id: customer.id,
    });
  });

  return customerCars;
};
