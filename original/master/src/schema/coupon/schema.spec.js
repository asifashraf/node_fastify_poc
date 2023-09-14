const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { couponDetails } = require('../../lib/test-fragments');
const { replace, join, map, omit, extend } = require('lodash');
const {
  coupons,
  customers,
  brands,
  brandLocations,
} = require('../../../database/seeds/development/index');
const { getDomainFromEmail } = require('../../lib/util');
const { couponType } = require('../root/enums');

test('customer can resolve coupons', async () => {
  const { id: customerId } = await getFirstId('customers');

  const query = `{
    customer(id: "${customerId}") {
      couponsAvailable(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", paging: {offset: 0, limit: 100}) { ${couponDetails} }
    }
  }`;
  // openInGraphiql(query);
  const {
    data: {
      customer: { couponsAvailable },
    },
  } = await fetchGraphQL(query);
  expect(couponsAvailable.length).toBeGreaterThan(0);
  expect(couponsAvailable).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: expect.anything(),
      }),
    ])
  );
});

test('brand can resolve coupons', async () => {
  const { id: brandId } = await getFirstId('brands');

  const query = `{
     brand(id: "${brandId}") {
        coupons(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", paging: {offset: 0, limit: 2}){ ${couponDetails} }
     }
   }`;
  // openInGraphiql(query);
  const {
    data: {
      brand: { coupons },
    },
  } = await fetchGraphQL(query);
  expect(coupons.length).toBeGreaterThan(0);
  expect(coupons).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: expect.anything() })])
  );
});

test('update coupon', async () => {
  const { id: couponId } = await getFirstId('coupons');

  const mutation = `mutation updateCouponMutation($coupon: CouponInput!){
    couponSave(coupon: $coupon) {
      coupon {
        ${couponDetails}
      }
    }
  }`;

  const queryVars = {
    coupon: {
      code: 'LIGHTGREEN UPDATED',
      endDate: '2019-04-03T00:00:00.000Z',
      id: couponId,
      status: 'ACTIVE',
      maxLimit: 25,
      redemptionLimit: 100,
      startDate: '2018-11-03T00:00:00.000Z',
      description:
        '1 Free Coffee when you Cultivar, bar a so grinder a macchiato beans. Cultivar cup irish, caffeine, dripper coffee, redeye saucer cappuccino sit macchiato.',
      heroPhoto: 'https://cofe-district.imgix.net/coupons/seed/coupon2.jpg',
      brands: [brands.starbucks.id],
      brandLocations: [brandLocations.caribou3.id],
      countryId: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
      couponDetails: [
        {
          type: couponType.FLAT_AMOUNT,
          amount: 1.9,
        },
      ],
    },
  };

  // console.log(mutation);
  const {
    data: { couponSave: coupon },
  } = await fetchGraphQL(mutation, queryVars);
  expect(coupon.coupon).toHaveProperty('id', couponId);
  expect(coupon.coupon).toHaveProperty('code', 'LIGHTGREEN UPDATED');
  expect(coupon.coupon.brands[0]).toHaveProperty('id', brands.starbucks.id);
  expect(coupon.coupon.brandLocations[0]).toHaveProperty(
    'id',
    brandLocations.caribou3.id
  );
});

const newCoupon = {
  code: 'TEST NEW COUPON',
  endDate: '2019-11-05T00:00:00Z',
  status: 'ACTIVE',
  maxLimit: 45,
  redemptionLimit: 98,
  startDate: '2017-11-03T00:00:00Z',
  description:
    '1 Free Coffee when you Cultivar, bar a so grinder a macchiato beans. Cultivar cup irish, caffeine, dripper coffee, redeye saucer cappuccino sit macchiato.',
  heroPhoto: 'https://cofe-district.imgix.net/coupons/seed/coupon2.jpg',
  brands: [brands.caribou.id],
  brandLocations: [brandLocations.starbucks2.id],
  countryId: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
  couponDetails: [
    {
      type: couponType.FLAT_AMOUNT,
      amount: 1.9,
    },
  ],
};

test('create coupon', async () => {
  // remove non-deterministic field instead of mocking?
  const couponCreateDetails = replace(couponDetails, 'createdAt', '');

  const mutation = `mutation createCouponMutation($coupon: CouponInput!){
    couponSave(coupon: $coupon) {
      coupon {
        ${couponCreateDetails}
      }
    }
  }`;

  const queryVars = {
    coupon: newCoupon,
  };

  // console.log(mutation);
  const {
    data: { couponSave: coupon },
  } = await fetchGraphQL(mutation, queryVars);
  expect(coupon.coupon).toHaveProperty('id');
  expect(coupon.coupon).toHaveProperty('code', 'TEST NEW COUPON');
  expect(coupon.coupon.brands[0]).toHaveProperty('id', brands.caribou.id);
  expect(coupon.coupon.brandLocations[0]).toHaveProperty(
    'id',
    brandLocations.starbucks2.id
  );
});

test('customer can resolve coupons by code', async () => {
  const query = `{
    couponByCodeAndCustomer(code: "${coupons[0].code}" countryIso: "KW") {
      ${couponDetails}
    }
  }`;
  // openInGraphiql(query);
  const {
    data: { couponByCodeAndCustomer },
  } = await fetchGraphQL(query);
  expect(couponByCodeAndCustomer).toHaveProperty('code', coupons[0].code);
  expect(couponByCodeAndCustomer).toHaveProperty('id');
});

test('coupon is valid for caribu1', async () => {
  const query = `{
    validateCoupon(code: "${coupons[0].code}" brandLocationId: "${brandLocations.caribou1.id}") {
      ${couponDetails}
    }
  }`;
  const {
    data: { validateCoupon },
  } = await fetchGraphQL(query);
  expect(validateCoupon).toHaveProperty('code', coupons[0].code);
  expect(validateCoupon).toHaveProperty('id');
});

test('coupon is invalid for starbucks2', async () => {
  const query = `{
    validateCoupon(code: "${coupons[0].code}" brandLocationId: "${brandLocations.starbucks2.id}") {
      ${couponDetails}
    }
  }`;
  const {
    data: { validateCoupon },
  } = await fetchGraphQL(query);
  expect(validateCoupon).toEqual(null);
});

test('can retrieve all coupons', async () => {
  const query = `{
    coupons(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", paging: {offset: 0, limit: 100}) {
      ${couponDetails}
    }
  }`;
  // openInGraphiql(query);
  const {
    data: { coupons },
  } = await fetchGraphQL(query);
  expect(coupons.length).toBeGreaterThan(0);
  expect(coupons).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: expect.anything() })])
  );
});

test("customer doesn't see coupons available with out a description", async () => {
  // Add a new coupon that doesn't have a description
  const mutation = `mutation createCouponMutation($coupon: CouponInput!){
    couponSave(coupon: $coupon) {
      coupon {
        id
      }
    }
  }`;

  const queryVars = {
    coupon: extend(omit(newCoupon, 'description'), {
      code: 'invisible',
      countryId: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    }),
  };

  // console.log(mutation, queryVars);
  await fetchGraphQL(mutation, queryVars);

  // add a new coupon w/ a description and photo
  const queryVars2 = {
    coupon: extend(newCoupon, {
      code: 'visible',
    }),
  };

  await fetchGraphQL(mutation, queryVars2);

  const query = `query {
      customerByAuth {
        couponsAvailable(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", paging: {offset: 0, limit: 2}) {
          id
          code
          country{
            id
          }
        }
      }
    }`;
  // openInGraphiql(query);

  // should not see the first one

  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test("customer doesn't see coupons available with out a hero_photo", async () => {
  // Add a new coupon that doesn't have a hero_photo
  const mutation = `mutation createCouponMutation($coupon: CouponInput!){
    couponSave(coupon: $coupon) {
      coupon {
        id
        country{
          id
        }
      }
    }
  }`;

  const queryVars = {
    coupon: extend(omit(newCoupon, 'heroPhoto'), {
      code: 'invisible',
      countryId: '01c73b60-2c6a-45f1-8dbf-88a5ce4ad179',
    }),
  };

  // console.log(mutation, queryVars);
  await fetchGraphQL(mutation, queryVars);

  // add a new coupon w/ a description and photo
  const queryVars2 = {
    coupon: extend(newCoupon, {
      code: 'visible',
    }),
  };

  await fetchGraphQL(mutation, queryVars2);

  const query = `query {
      customerByAuth {
        couponsAvailable(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", paging: {offset: 0, limit: 2}) {
          id
          code
          country{
            id
          }
        }
      }
    }`;
  // openInGraphiql(query);

  // should not see the first one

  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('customer has coupons available by email domain', async () => {
  const testCustomer = customers[1];

  const validEmailDomains = `,,,,netscape.net,,,,,dbzmail.com,,,,${getDomainFromEmail(
    testCustomer.email
  )}`;

  const brandsList = join(
    map(brands, brand => {
      return `"${brand.id}"`;
    }),
    ','
  );

  const mutation = ` mutation {
  couponSave(coupon:{
    code:"DOMAIN_TEST_COUPON"
    heroPhoto: "photo.jpg"
    description: "test"
    redemptionLimit: 100
    customerRedemptionLimit: 10
    status: ACTIVE
    startDate: "2018-01-01 00:00:00"
    endDate: "2020-01-01 23:14:14"
    validEmailDomains: "${validEmailDomains}"
    countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179",
    brands:[${brandsList}]
    couponDetails: [
      {
        type: ${couponType.FLAT_AMOUNT}
        amount: 12.12
      }
    ]
    }) {
      coupon {
        code
        customerRedemptionLimit
        validEmailDomains
        country{
          id
          name{
            en
            ar
          }
        }
      }
    }
  }`;
  // openInGraphiql(mutation);
  const mutationResult = await fetchGraphQL(mutation);
  expect(mutationResult).toMatchSnapshot();

  const query = `query {
    customer(id:"${testCustomer.id}") {
      couponsAvailable(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", paging: {offset: 0, limit: 2}) {
        code
        redemptionCount
        customerRedemptionsCount
        validEmailDomains
        country{
          id
          name{
            en
            ar
          }
        }
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();

  const query2 = `query {
    customer(id:"${customers[3].id}") {
      couponsAvailable(countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179", paging: {offset: 0, limit: 2}) {
        redemptionCount
        customerRedemptionsCount
        validEmailDomains
        code
        country{
          id
        }
      }
    }
  }`;
  // openInGraphiql(query);
  const result2 = await fetchGraphQL(query2);
  expect(result2).toMatchSnapshot();
});
