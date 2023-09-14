const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const {
  menuDetails,
  menuItemDetailsNoAvailability,
  sampleMenuId,
} = require('../../lib/test-fragments');

test('brand locations can resolve menus', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `
    query brandLocationResolvesMenu($brandLocationId: ID!) {
      brandLocation(id: $brandLocationId) {
        menu { ${menuDetails} }
      }
    }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query, {
    brandLocationId,
  });
  expect(result).toMatchSnapshot();
});

test('brand can resolve menus', async () => {
  const { id: brandId } = await getFirstId('brands');

  const query = `{
    brand(id: "${brandId}") {
      menu(countryId:"01c73b60-2c6a-45f1-8dbf-88a5ce4ad179") { ${menuItemDetailsNoAvailability} }
    }
  }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('get menus', async () => {
  const query = `{
  menus {
    id
  }
}`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('get menu by id', async () => {
  const query = `{
  menu(id: "${sampleMenuId}") {
    id
  }
}`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
