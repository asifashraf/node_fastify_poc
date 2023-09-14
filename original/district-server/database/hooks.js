// const knexHooks = require('knex-hooks');
// const { simulateSelectLatency, countDbQueries } = require('../config');
//
// const {
//   transformToCamelCase,
//   transformToSnakeCase,
// } = require('../src/lib/util');

const metrics = { numQueries: 0 };

function applyHooks(knex) {
  // knexHooks(knex);
  //
  // knex.addHook('before', 'insert', '*', (when, method, table, params) => {
  //   const data = knexHooks.helpers.getInsertData(params.query);
  //   transformToSnakeCase(data);
  // });
  //
  // knex.addHook('before', 'update', '*', (when, method, table, params) => {
  //   const data = knexHooks.helpers.getUpdateData(params.query);
  //   transformToSnakeCase(data);
  // });
  //
  // knex.addHook('after', 'select', '*', (when, method, table, params) => {
  //   transformToCamelCase(params.result);
  // });
  //
  // // Simulate db latency, intended for local performance testing
  // if (simulateSelectLatency) {
  //   console.log(`Simulating db latency of ${simulateSelectLatency} seconds`);
  //   knex.addHook('before', '*', '*', () =>
  //     knex.raw(`select pg_sleep(${simulateSelectLatency})`)
  //   );
  // }
  //
  // if (countDbQueries) {
  //   console.log('Counting db queries');
  //   knex.addHook('before', '*', '*', () => {
  //     metrics.numQueries += 1;
  //     // console.log('Number of db queries', metrics.numQueries);
  //   });
  // }
}

module.exports = {
  applyHooks,
  metrics,
};
