const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { scheduleExceptionsDetails } = require('../../lib/test-fragments');
const {
  costa1,
} = require('../../../database/seeds/development').brandLocations;

test('brand locations can resolve scheduleException', async () => {
  const query = `{
    brandLocation(id: "${costa1.id}") {
      scheduleExceptions { ${scheduleExceptionsDetails} }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('scheduleExceptions can be added', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `mutation { brandLocationScheduleExceptionSave(scheduleExceptions: [
    {
      brandLocationId: "${brandLocationId}"
		  startTime:"2021-11-16T01:20:45+01:00"
		  endTime:"2022-11-16T12:20:14+01:00"
      isClosed:false
      isDeliveryClosed:false
      isExpressDeliveryClosed:false
    },
    {
      brandLocationId: "${brandLocationId}"
		  startTime:"2021-11-17T01:20:45+01:00"
		  endTime:"2022-11-17T12:20:14+01:00"
      isClosed:false
      isDeliveryClosed:false
      isExpressDeliveryClosed:false
    }
  ]) {
        error
        errors
        scheduleExceptions {
          id
          isClosed
          isDeliveryClosed
	        startTime
          endTime
         }
        }
      }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
