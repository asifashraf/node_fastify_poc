const { fetchGraphQL } = require('../../lib/test-util');
const { statusTypes } = require('../root/enums');
const { categories } = require('../../../database/seeds/development');

test('can list categories', async () => {
  const query = `query {
    categories {
      items {
        id
      }
      paging {
        totalItems
      }
    }
  }`;

  const response = await fetchGraphQL(query);
  const { data } = response;
  expect(data).toHaveProperty('categories.items');
  expect(data).toHaveProperty('categories.paging.totalItems');
});

test('can get a category by id', async () => {
  const query = `query {
    category(id: "${categories.cat_1.id}") {
      id
    }
  }`;

  const response = await fetchGraphQL(query);
  const { data } = response;
  expect(data).toHaveProperty('category.id', categories.cat_1.id);
});

test('can add a category', async () => {
  const name = 'test category 1';
  const query = `mutation {
    categorySave(input: {
      name: {
        en: "${name}"
        ar: ""
      }
      photo: "https://i.picsum.photos/id/1060/800/450.jpg"
      status: ${statusTypes.ACTIVE}
    }) {
      category {
        id
        name {
          en
          ar
        }
      }
      error
    }
  }`;

  const response = await fetchGraphQL(query);
  const { data } = response;
  expect(data).toHaveProperty('categorySave.category.name.en', name);
});

test('can update a category', async () => {
  const name = 'test category updated';
  const query = `mutation {
    categorySave(input: {
      id: "${categories.cat_1.id}"
      name: {
        en: "${name}",
        ar: "",
      }
      photo: "https://i.picsum.photos/id/1060/800/450.jpg"
      status: ${statusTypes.ACTIVE}
    }) {
      category {
        id
        name {
          en
          ar
        }
      }
      error
    }
  }`;

  const response = await fetchGraphQL(query);
  const { data } = response;
  expect(data).toHaveProperty('categorySave.category.name.en', name);
});
