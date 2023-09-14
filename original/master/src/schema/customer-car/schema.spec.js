const { fetchGraphQL, testDb } = require('../../lib/test-util');
const { customerCarDetails } = require('../../lib/test-fragments');
const { filter } = require('lodash');
const {
  customers: [{ id: customerId }],
} = require('../../../database/seeds/development');

test('customer can resolve defaultCar', async () => {
  const query = `{
    customer(id: "${customerId}") {
      defaultCar { ${customerCarDetails} }
    }
  }`;
  // openInGraphiql(query);
  const {
    data: {
      customer: { defaultCar },
    },
  } = await fetchGraphQL(query);
  expect(defaultCar.isDefault).toBeTruthy();
  expect(defaultCar).toMatchSnapshot();
});

test('customer can resolve cars', async () => {
  const query = `{
    customer(id: "${customerId}") {
      cars { ${customerCarDetails} }
    }
  }`;
  // openInGraphiql(query);
  const {
    data: {
      customer: { cars },
    },
  } = await fetchGraphQL(query);
  expect(cars.length).toEqual(2);
  expect(cars).toMatchSnapshot();
});

test('customer can save car', async () => {
  const query = `mutation {
                   customerSaveCar(car: {
                    customerId: "${customerId}"
                    name: "Lambo 212"
                    brand: "Lamborghini"
                    color: "Black"
                    plateNumber: "212FLY"
                    isDefault: true
                  }) {
                    error
                    errors
                    customer {
                      cars {
                        id
                        name
                        isDefault
                      }
                     }
                   }
                  }`;

  // openInGraphiql(query);
  const {
    data: {
      customerSaveCar: {
        customer: { cars },
      },
    },
  } = await fetchGraphQL(query);

  // should only get 1 car here
  const defaultCars = filter(cars, 'isDefault', true);
  expect(defaultCars.length).toEqual(1);
  expect(defaultCars[0].name).toEqual('Lambo 212');
  expect(cars).toMatchSnapshot();
});

test('newly saved car is automatically set as default', async () => {
  await testDb
    .handle('customer_cars')
    .where('customer_id', customerId)
    .del();

  const query = `mutation {
                   customerSaveCar(car: {
                    customerId: "${customerId}"
                    name: "Lambo 212"
                    brand: "Lamborghini"
                    color: "Black"
                    plateNumber: "212FLY"
                  }) {
                    error
                    errors
                    customer {
                      cars {
                        id
                        name
                        isDefault
                      }
                     }
                   }
                  }`;

  // openInGraphiql(query);

  const {
    data: {
      error,
      customerSaveCar: {
        customer: { cars },
      },
    },
  } = await fetchGraphQL(query);

  expect(error).toBeUndefined();

  // should only get 1 car here
  const defaultCars = filter(cars, 'isDefault', true);
  expect(defaultCars.length).toEqual(1);
  expect(defaultCars[0].name).toEqual('Lambo 212');

  expect(cars.length).toEqual(1);
  expect(cars).toMatchSnapshot();
});
