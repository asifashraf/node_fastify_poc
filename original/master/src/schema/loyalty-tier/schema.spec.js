const { fetchGraphQL } = require('../../lib/test-util');
const { loyaltyTierSaveError } = require('../root/enums');

const {
  countries,
  currencies,
  loyaltyTiers,
} = require('../../../database/seeds/development/index');

test('can add a loyalty tier', async () => {
  const name = 'just added';
  const query = `mutation{
    loyaltyTierSave(loyaltyTierInput: {
      name: "${name}"
      sku: "SKU100"
      countryId: "${countries.kuwait.id}"
      currencyId: "${currencies.kd.id}"
    }) {
      loyaltyTier{
        name
        sku
      }
    }
  }`;
  const {
    data: {
      loyaltyTierSave: { loyaltyTier },
    },
  } = await fetchGraphQL(query);
  expect(loyaltyTier).toHaveProperty('name', name);
  expect(loyaltyTier).toHaveProperty('sku', 'SKU100');
});

test('cannot add a loyalty tier with an already existent sku', async () => {
  const name = 'duplicate sku';
  const query = `mutation{
    loyaltyTierSave(loyaltyTierInput: {
      name: "${name}"
      sku: "${loyaltyTiers[0].sku}"
      countryId: "${countries.kuwait.id}"
      currencyId: "${currencies.kd.id}"
    }) {
      loyaltyTier{
        name
        sku
      }
      error
    }
  }`;
  const {
    data: { loyaltyTierSave },
  } = await fetchGraphQL(query);
  expect(loyaltyTierSave).toHaveProperty(
    'error',
    loyaltyTierSaveError.DUPLICATE_SKU
  );
});

test('can update a loyalty tier', async () => {
  const name = 'just updated';
  const query = `mutation{
    loyaltyTierSave(loyaltyTierInput: {
      id: "${loyaltyTiers[0].id}"
      name: "${name}"
      sku: "${loyaltyTiers[0].sku}"
      countryId: "${countries.kuwait.id}"
      currencyId: "${currencies.kd.id}"
    }) {
      loyaltyTier{
        name
        sku
      }
      error
    }
  }`;
  const {
    data: {
      loyaltyTierSave: { loyaltyTier },
    },
  } = await fetchGraphQL(query);
  expect(loyaltyTier).toHaveProperty('name', name);
  expect(loyaltyTier).toHaveProperty('sku', loyaltyTiers[0].sku);
});

test('can get a loyalty tier and resolve country and currency', async () => {
  const { id } = loyaltyTiers[0];
  const query = `{
    loyaltyTier(id: "${id}") {
      id
      sku
      name
      country {
        id
      }
      currency {
        id
      }
    }
  }`;
  const {
    data: { loyaltyTier },
  } = await fetchGraphQL(query);
  expect(loyaltyTier).toHaveProperty('id', id);
  expect(loyaltyTier).toHaveProperty('sku');
  expect(loyaltyTier).toHaveProperty('name');
  expect(loyaltyTier).toHaveProperty('country.id');
  expect(loyaltyTier).toHaveProperty('currency.id');
});

test('can get loyalty tiers', async () => {
  const query = `{
    loyaltyTiers {
      id
    }
  }`;
  const {
    data: { loyaltyTiers },
  } = await fetchGraphQL(query);
  expect(loyaltyTiers).toEqual(expect.arrayContaining([expect.anything()]));
  expect(loyaltyTiers.length).toBeGreaterThan(0);
  loyaltyTiers.map(loyaltyTier => {
    return expect(loyaltyTier).toHaveProperty('id');
  });
});

test('can get loyalty tiers by country code', async () => {
  const query = `{
    loyaltyTiers(countryCode: "${countries.kuwait.iso_code}") {
      id
      country {
        isoCode
      }
    }
  }`;
  const {
    data: { loyaltyTiers },
  } = await fetchGraphQL(query);
  expect(loyaltyTiers).toEqual(expect.arrayContaining([expect.anything()]));
  expect(loyaltyTiers.length).toBeGreaterThan(0);
  loyaltyTiers.map(loyaltyTier => {
    expect(loyaltyTier).toHaveProperty('id');
    expect(loyaltyTier).toHaveProperty(
      'country.isoCode',
      countries.kuwait.iso_code
    );
    return loyaltyTier;
  });
});

test('can get loyalty tiers by country id', async () => {
  const query = `{
    loyaltyTiers(countryId: "${countries.saudi_arabia.id}") {
      id
      country {
        id
      }
    }
  }`;
  const {
    data: { loyaltyTiers },
  } = await fetchGraphQL(query);
  expect(loyaltyTiers).toEqual(expect.arrayContaining([expect.anything()]));
  expect(loyaltyTiers.length).toBeGreaterThan(0);
  loyaltyTiers.map(loyaltyTier => {
    expect(loyaltyTier).toHaveProperty('id');
    expect(loyaltyTier).toHaveProperty('country.id', countries.saudi_arabia.id);
    return loyaltyTier;
  });
});
