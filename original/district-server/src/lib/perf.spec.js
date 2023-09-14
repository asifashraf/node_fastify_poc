const { times } = require('lodash');
const { fetchGraphQL } = require('./test-util');
const { countDbQueries } = require('../../config');
const { metrics } = require('../../database/hooks');

test.skip('perf time of 5 locationsForHomeScreen queries', async () => {
  const query = `query locationsForHomeScreen($hasDelivery: Boolean, $location: GISLocationInput, $neighborhoodId: ID, $paging: PagingInput) {
    locationsForHomeScreen(hasDelivery: $hasDelivery, location: $location, neighborhoodId: $neighborhoodId, paging: $paging) {
      acceptingOrders
      deliveryRadius
      address {
        city
        latitude
        longitude
        shortAddress
        shortAddressAr
        street
      }
      availableFulfillment {
        delivery
        pickup
      }
      brand {
        id
        name
      }
      deliveryLocation {
        id
      }
      distance
      heroPhoto
      id
      neighborhoods {
        id
        name
      }
      openings(numberOfDaysToScan: 0) {
        delivery {
          begin
          end
        }
        pickup {
          begin
          end
        }
      }
      phone
      timeZoneIdentifier
    }
  }`;
  // openInGraphiql(query);
  console.time('locationsForHomeScreen x 5');
  await Promise.all(times(5, () => fetchGraphQL(query)));
  console.timeEnd('locationsForHomeScreen x 5');
  if (countDbQueries) {
    console.log('Number of queries', metrics.numQueries);
  } else {
    console.log('Enable COUNT_DB_QUERIES to see number of queries');
  }
}, 30000);
