const { fetchGraphQL } = require('../../lib/test-util');
const {
  configurationDetails,
  configurationUpdateDetails,
} = require('../../lib/test-fragments');

test('get configuration', async () => {
  const query = `{
  config {
    ${configurationDetails}
  }
}`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

// change the value of each field to
// differ from what's in the test db
const updateConfig = `{
  defaultLatitude: 48.990341,
  defaultLongitude: 30.378586,
  deliveryFee: "0.600",
  deliveryWindowMin: 30,
  deliveryWindowMax: 40,
  maxCartSize: 21,
  serviceFee: "0.350"
  phone: "123-123-1234"
  email: "test@tester.com"
}`;

test('update configuration', async () => {
  const mutation = `mutation {
    configurationSave(configuration: ${updateConfig}) {
      error
      errors 
      configuration { ${configurationUpdateDetails} } 
    }
  }`;

  // console.log(mutation);
  const result = await fetchGraphQL(mutation);
  expect(result).toMatchSnapshot();
});
