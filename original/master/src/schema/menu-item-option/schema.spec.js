const { fetchGraphQL } = require('../../lib/test-util');
const {
  menuItemOptionDetails,
  sampleBrandId,
} = require('../../lib/test-fragments');

test('menu item option sets can resolve their menu item options', async () => {
  const query = `{
    brand(id: "${sampleBrandId}") {
      menu(countryId:"01c73b60-2c6a-45f1-8dbf-88a5ce4ad179") {
        sections {
          items {
            optionSets {
              options {
                ${menuItemOptionDetails}
              }
            }
          }
        }
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
