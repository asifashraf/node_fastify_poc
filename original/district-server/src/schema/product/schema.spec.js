const { fetchGraphQL } = require('../../lib/test-util');
const { statusTypes } = require('../root/enums');
const {
  brands,
  categories,
  pickupLocations,
} = require('../../../database/seeds/development');

test('can add a product', async () => {
  const name = 'product 1';
  const description = 'description product 1';
  const query = `mutation {
    productSave(input: {
      name: {
        en: "${name}"
        ar: ""
      }
      description: {
        en: "${description}"
        ar: ""
      }
      status: ${statusTypes.ACTIVE}
      warranty: 24
      brandId: "${brands.caribou.id}"
      categoryIds: [ "${categories.cat_1.id}" ]
      images: [
        {url: "https://picsum.photos/450"},
        {url: "https://picsum.photos/550"},
      ]
      inventories: [
        {
          pickupLocationId: "${pickupLocations.loc_1.id}"
          quantity: 5
        }
      ]
      returnPolicy: {
        name: "test ret pol"
        returnable: true
        description: {
          en: "test desc"
          ar: "test desc ar"
        }
        returnTimeFrame: 20
      }
    }) {
      product {
        id
        name {
          en
          ar
        }
        description {
          en
          ar
        }
      }
      error
    }
  }`;

  const {
    data: {
      productSave: { product },
    },
  } = await fetchGraphQL(query);
  expect(product).toHaveProperty('name.en', name);
  expect(product).toHaveProperty('description.en', description);
});
