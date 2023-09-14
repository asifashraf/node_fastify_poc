const { fetchGraphQL } = require('../../lib/test-util');

test('get all active banners by country id', async () => {
  const query = `
  {
    banners(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179") {
      id
      imageUrl {
        en
        ar
      }
      type
      size
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('get all active banners by country code', async () => {
  const query = `
  {
    banners(countryCode: "KW") {
      id
      imageUrl {
        en
        ar
      }
      type
      size
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('get all banners', async () => {
  const query = `
  {
    banners(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", showInactive: true) {
      id
      imageUrl {
        en
        ar
      }
      type
      size
      active
      order
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('get banner by id', async () => {
  const query = `
  {
    banner(id: "cc451fc7-6585-4bdd-bcab-c32b20568924") {
      id
      imageUrl {
        en
        ar
      }
      type
      size
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('create banner', async () => {
  const query = `
  mutation {
    bannerSave(bannerInput: {
      countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179"
      type: "test"
      size: MEDIUM
      order: 501
      imageUrl: {
        en: "test1"
        ar: "test2"
      }
      active: true
    }) {
      banner{
        id
        imageUrl {
          en
          ar
        }
        type
        size
        active
        order
      }
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('update banner', async () => {
  const query = `
  mutation {
    bannerSave(bannerInput: {
      id: "cc451fc7-6585-4bdd-bcab-c32b20568924"
      type: "test-updated"
      size: SMALL
      order: 111
      imageUrl: {
        en: "test1-updated"
        ar: "test2-updated"
      }
      active: false
    }) {
      banner{
        id
        imageUrl {
          en
          ar
        }
        type
        size
        active
        order
      }
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('delete existing banner', async () => {
  const query = `
  mutation {
    bannerDelete(id: "cc451fc7-6585-4bdd-bcab-c32b20568924")
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('delete non-existing banner', async () => {
  const query = `
  mutation {
    bannerDelete(id: "cc451fc7-6585-4bdd-bcab-c32b20568925")
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
