const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { customerAddressDetails } = require('../../lib/test-fragments');
const {
  customers: [{ id: customerId }],
} = require('../../../database/seeds/development');

test('customer can resolve defaultAddress', async () => {
  const query = `{
    customer(id: "${customerId}") {
      defaultAddress { ${customerAddressDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('customer can resolve addresses', async () => {
  const query = `{
    customer(id: "${customerId}") {
      addresses { ${customerAddressDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('customer can save address', async () => {
  const { id: neighborhoodId } = await getFirstId('neighborhoods');
  const query = `mutation{
                   customerSaveAddress(address:{
                    friendlyName: "My Friendly Address"
                    isDefault: true
                    latitude:12.121212
                    longitude:12.4444
                    block:"12"
                    street: "some street"
                    buildingName: "EMPIRE STATE"
                    neighborhoodId:"${neighborhoodId}"
                    streetNumber: "12"
                    type:HOUSE
                    countryCode: "AE"
                    extraFields: [{
                      id: "cc451fc7-6585-4bdd-bcab-c32b20568924"
                      value: "field value - nickname"
                    },
                    {
                      id: "141afd5c-b04e-47cc-b67b-b6b57ac3702c"
                      value: "field value - details"
                    },
                    ]
                  }) {
                     error
                    errors
                    customer {
                      defaultAddress {
                        friendlyName
                        buildingName
                        isDefault
                        id
                        city
                        countryCode
                        extraFields{
                          id
                          name {
                            en
                            ar
                          }
                          value
                          isRequired
                        }
                      }
                      addresses {
                        id
                        isDefault
                        countryCode
                        extraFields{
                          id
                          name {
                            en
                            ar
                          }
                          value
                          isRequired
                        }
                      }
                    }
                   }
                  }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
