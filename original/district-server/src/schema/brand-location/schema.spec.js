const {
  fetchGraphQL,
  getFirstId,
  // openInGraphiql,
  testDb,
} = require('../../lib/test-util');
const {
  brandLocationDetails,
  sampleOrderSetId,
} = require('../../lib/test-fragments');
const {
  brandLocations,
  brands,
  neighborhoods,
} = require('../../../database/seeds/development');
const moment = require('moment-timezone');

test('get brand locations', async () => {
  const query = `{
  brandLocations {
    id
  }
}`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('get brand locations that deliver', async () => {
  const query = `{
  brandLocationsThatDeliver {
    ${brandLocationDetails}
  }
}`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('locationsForHomeScreen can return brand locations', async () => {
  const query = `{
    locationsForHomeScreen {
      ${brandLocationDetails}
      distance
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('locationsForHomeScreen can return delivery locations', async () => {
  const query = `{
    locationsForHomeScreen (hasDelivery: true) {
      brand {
        name {
          en
          ar
        }
      }
      name {
        en
        ar
      }
      availableFulfillments
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('locationsForSearchScreen can return brand locations', async () => {
  const query = `query  locationsForSearchScreen($searchTerm: String!, $location: GISLocationInput, $paging: PagingInput) {
    locationsForSearchScreen(searchTerm: $searchTerm, location: $location, paging: $paging) {
      distance
      name {
        en
        ar
      }
      address {
        longitude
        latitude
      }
      brand {
        name{
          en
          ar
        }
      }
    }
  }`;

  const variables = {
    searchTerm: 'Cof',
    location: {
      longitude: 47.9748705,
      latitude: 29.3712177,
    },
    paging: {
      limit: 10,
      offset: 1,
    },
  };
  // openInGraphiql(query, variables);

  const result = await fetchGraphQL(query, variables);
  expect(result).toMatchSnapshot();
});

test('locationsForPickup can return brand locations', async () => {
  const query = `query  locationsForPickup($brandId: ID!, $location: GISLocationInput, $paging: PagingInput) {
    locationsForPickup(brandId: $brandId, location: $location, paging: $paging) {
      distance
      name {
        en
        ar
      }
      address {
        longitude
        latitude
      }
      brand {
        name{
          en
          ar
        }
      }
    }
  }`;
  // openInGraphiql(query);

  const { id: brandId } = await getFirstId('brands');

  const variables = {
    brandId,
    location: {
      longitude: 47.9748705,
      latitude: 29.3712177,
    },
    paging: {
      limit: 10,
      offset: 1,
    },
  };

  const result = await fetchGraphQL(query, variables);
  expect(result).toMatchSnapshot();
});

test('locationsForHomeScreen can return brand locations with paging', async () => {
  const query = `{
    locationsForHomeScreen(paging: {offset: 1, limit: 2}) {
      ${brandLocationDetails}
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('brands can resolve brand locations', async () => {
  const query = `{
    brands {
      locations { id }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('orders can resolve brand locations', async () => {
  const query = `{
    orderSet(id: "${sampleOrderSetId}") {
      brandLocation { id }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('brand locations can resolve their delivery locations', async () => {
  const query = `{
    brandLocation(id: "${brandLocations.caribou2.id}") {
      deliveryLocation {
        id
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('can save a brand location', async () => {
  const { id: brandId } = await getFirstId('brands');
  const { id: cityId } = await getFirstId('cities');
  const { id: currencyId } = await getFirstId('currencies');

  const query = `mutation {
    brandLocationSave(brandId: "${brandId}", brandLocation:{
      name: {
        en: "Four Seasons",
        ar: "أربعة مواسم"
      }
      address:{
          city:"Kuwait City"
          street:"21 Jump St"
          latitude:29.3774545
          longitude:47.9896755
          neighborhoodId: "77f37047-b4a2-43fc-b4ca-b95597412582"
          cityId: "${cityId}"
      }
      email: [
        {email: "test@test.com",  contactName: "Mr. Test Name"},
      ]
      phone:"633-882-1560"
      heroPhoto:"https://source.unsplash.com/KixfBEdyp64/1200x600"
      acceptingOrders: true
      deliveryRadius: 0.000
      availableFulfillment:{
        delivery: true
        pickup: true
      }
      currencyId: "${currencyId}"
      status: ACTIVE
    }) {
      error
      errors
      brandLocation {
        id
        name {
          en
          ar
        }
        address {
          latitude
          longitude
        }
      }
    }
  }
  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('costa1 is closed all day Monday the 4th', async () => {
  const start = moment('2017-12-04T04:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.costa1.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('costa1 closes early Tuesday the 5th', async () => {
  const start = moment('2017-12-05T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.costa1.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('costa1 opens late Wednesday the 6th', async () => {
  const start = moment('2017-12-06T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.costa1.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('costa1 closes mid-day Thursday the 7th', async () => {
  const start = moment('2017-12-07T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.costa1.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('costa1 stays open later Friday the 8th', async () => {
  const start = moment('2017-12-08T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.costa1.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('starbucks3 closed all day Monday the 4th', async () => {
  const start = moment('2017-12-04T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.starbucks3.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('starbucks3 closes at noon Tuesday the 5th', async () => {
  const start = moment('2017-12-05T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.starbucks3.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('starbucks3 opens at noon Wednesday the 6th', async () => {
  const start = moment('2017-12-06T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.starbucks3.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('starbucks3 closes mid-day Thursday the 7th', async () => {
  const start = moment('2017-12-07T05:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.starbucks3.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('starbucks3 closed from Sunday the 11th through Saturday the 17th', async () => {
  const start = moment('2017-12-14T14:00:00+03:00').toISOString();
  const query = `{
    brandLocation(id: "${brandLocations.starbucks3.id}") {
      openings(timespanStart: "${start}", numberOfDaysToScan: 1) {
        pickup {
          begin
          end
        }
        delivery {
          begin
          end
        }
      }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('brand location can save neighborhood', async () => {
  const { id: cityId } = await getFirstId('cities');
  const { id: currencyId } = await getFirstId('currencies');
  const query = `mutation {
    brandLocationSave(brandId: "aed15607-823c-4a04-b33c-4449f3e68c60", brandLocation: {
      id: "903fb8ed-9ebc-4a36-8e92-4305d157c929"
      name: {
        en: "123 Test Address",
        ar: "123 عنوان الاختبار"
      }
      address: {
        street: "Test Street"
        city: "Test City"
        longitude: 10.5
        latitude: 74.5
        neighborhoodId: "77f37047-b4a2-43fc-b4ca-b95597412582"
        cityId: "${cityId}"
      }
      phone: "123-123-1234"
      email: [
        {email: "test@test.com",  contactName: "Testy Mc Testerson", deleted: true},
      ]
      heroPhoto: "https://source.unsplash.com/KixfBEdyp64/1200x600"
      deliveryLocationId: null
      acceptingOrders: true
      deliveryRadius: 0.000
      availableFulfillment: {
        delivery: false
        pickup: false
      }
      currencyId: "${currencyId}"
      status: ACTIVE
      neighborhoods: [
      {
        brandLocationId: "903fb8ed-9ebc-4a36-8e92-4305d157c929"
        neighborhoodId: "${neighborhoods[0].id}"
      }
      {
        brandLocationId: "903fb8ed-9ebc-4a36-8e92-4305d157c929"
        neighborhoodId: "${neighborhoods[1].id}"
      }]
    }) {
      brandLocation { id }
      error
      errors
    }
  }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('a location set as primary will be returned in home screen', async () => {
  const query = `{
    locationsForHomeScreen {
      id
      distance
      brand {
        name {
          en
          ar
        }
        id
      }
      name {
        en
        ar
      }
      address {
        latitude
        longitude
      }
    }
  }
  `;

  // openInGraphiql(query);
  const before = await fetchGraphQL(query);
  expect(before).toMatchSnapshot();

  const { id: locationId } = brandLocations.starbucks1;
  const { id: brandId } = brands.starbucks;

  await testDb
    .handle('brands')
    .update('primary_location_id', locationId)
    .where('id', brandId);

  const after = await fetchGraphQL(query);
  expect(after).toMatchSnapshot();
});
