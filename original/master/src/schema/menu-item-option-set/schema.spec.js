const { fetchGraphQL } = require('../../lib/test-util');
const {
  menuItemOptionSetDetails,
  sampleBrandId,
} = require('../../lib/test-fragments');

test('menu items can resolve menu item option sets', async () => {
  const query = `{
    brand(id: "${sampleBrandId}") {
      menu(countryId:"01c73b60-2c6a-45f1-8dbf-88a5ce4ad179") {
        sections {
          items {
            optionSets {
              ${menuItemOptionSetDetails}
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
