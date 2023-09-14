const {
  fetchGraphQL,
  // getFirstId,
  // openInGraphiql,
  queryContext,
  testDb,
} = require('../../lib/test-util');
const { currencyDetails } = require('../../lib/test-fragments');

test('can resolve all currencies', async () => {
  const query = `{
    currencies { ${currencyDetails} }
    }`;
  // openInGraphiql(query);
  const {
    data: { currencies },
  } = await fetchGraphQL(query);
  expect(currencies.length).toBeGreaterThan(0);
  currencies.map(currency => {
    return expect(currency).toHaveProperty('id');
  });
});

test('can get currency by code', async () => {
  const currency = await queryContext.handle.currency.getByCode('SAR');
  expect(currency).toHaveProperty('id');
});

test('currency.getByCode defaults to KWD', async () => {
  const currency = await queryContext.handle.currency.getByCode();
  expect(currency).toHaveProperty('isoCode', 'KWD');
  await testDb
    .handle('currencies')
    .where('iso_code', 'KWD')
    .update({ isoCode: 'KD' });
  const currency2 = await queryContext.handle.currency.getByCode();
  expect(currency2).toHaveProperty('isoCode', 'KD');
});

test('currency can resolve country', async () => {
  const query = `{
    currency(id: "f216d955-0df1-475d-a9ec-08cb6c0f92bb") {
      country {
        id
      }
    }
  }`;
  // openInGraphiql(query);
  const {
    data: { currency },
  } = await fetchGraphQL(query);
  // console.log(currency);
  expect(currency).toHaveProperty('country.id');
});
