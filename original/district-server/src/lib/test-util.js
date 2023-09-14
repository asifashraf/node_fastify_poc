const { first, constant } = require('lodash');
const casual = require('casual');
const opn = require('opn');
const _axios = require('axios');
const getPort = require('get-port');
const { run } = require('../index');
const knex = require('../../database/index');
const redis = require('../../redis');
const KinesisLogHelper = require('./aws-kinesis-logging');
const { timezone } = require('../../config');
const loadSchema = require('../schema-loader');
const QueryContext = require('../query-context');

const { setUuidFn, setNowFn } = require('../lib/util');
setUuidFn(casual._uuid);
setNowFn(constant('2017-11-15T12:30:00+03:00'));
// This is to prevent bluebird doing a console.warning for an u     nhandled rejection
// It seems to come from the transaction.rollback done in postTest
process.on('unhandledRejection', () => {});

function createTransaction() {
  return new Promise(resolve => {
    return knex.transaction(resolve).catch(() => ({}));
  });
}

const defaultHeaders = {
  'API-Token': '05c6a6a0-6870-4072-af1a-df1d4fd58178',
  'Accept-Language': 'ar;q=0.9',
};

const axios = _axios.create({ headers: { ...defaultHeaders } });

let seedNumber = 123;
let serverPort;
let server;
let endpointUrl;
let restEndpointUrl;
let transaction;
let mockUser = { id: 'a788e584-866d-4eb0-9b05-d3459e05a86c' };
const schema = loadSchema();

// Handle will be set per test
const testDb = { handle: null };
const queryContext = { handle: null };

function fetchGraphQL(query, variables) {
  return axios
    .post(endpointUrl, { query, variables })
    .then(({ data }) => data)
    .catch(err => {
      const {
        response: { data },
      } = err;
      if (data.errors) {
        throw new Error(JSON.stringify(data.errors, null, 4));
      }
      throw new Error(data);
    });
}

function mockDate() {
  return '2017-10-19';
}

function setMockUser(user) {
  mockUser = user;
}

function getFirstId(tableName) {
  return testDb
    .handle(tableName)
    .select('id')
    .limit(1)
    .then(first);
}

beforeAll(async () => {
  serverPort = await getPort();
  restEndpointUrl = `http://localhost:${serverPort}`;
  endpointUrl = `${restEndpointUrl}/graphql`;

  server = await run(
    { PORT: serverPort, SKIP_MIGRATIONS: true },
    testDb,
    redis,
    {
      mockUser,
      uuidFn: casual._uuid,
      nowFn: constant('2017-11-15T12:30:00+03:00'),
      timeOverride: {
        zone: timezone,
        year: 2017,
        month: 11,
        day: 15,
        hour: 12,
        minute: 30,
      },
    }
  );
});

afterAll(async () => {
  server.close();
  server = null;
  await knex.destroy();
  await redis.quit();
});

beforeEach(async () => {
  casual.seed(seedNumber++);
  // Create a transaction and try to update all db refs to it
  transaction = await createTransaction();
  testDb.handle = transaction;
  queryContext.handle = new QueryContext(
    testDb,
    redis,
    KinesisLogHelper,
    {},
    undefined,
    schema
  );
});

afterEach(async () => {
  try {
    await transaction.rollback(new Error('rollback'));
  } catch (err) {
    console.log(err);
  }
});

function objToGraphiql(obj) {
  let url = `http://localhost:4000/graphiql?query=${encodeURIComponent(
    obj.query
  )}`;
  if (obj.variables) {
    url += `&variables=${encodeURIComponent(JSON.stringify(obj.variables))}`;
  }
  if (obj.operationName) {
    url += `&operationName=${encodeURIComponent(obj.operationName)}`;
  }
  return url;
}

function openInGraphiql(query, variables) {
  opn(objToGraphiql({ query, variables }));
}

module.exports = {
  fetchGraphQL,
  mockDate,
  setMockUser,
  getFirstId,
  testDb,
  redis,
  openInGraphiql,
  queryContext,
  mockUser,
};
