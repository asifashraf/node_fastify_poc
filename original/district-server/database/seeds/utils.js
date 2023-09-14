const moment = require('moment');
const casual = require('casual');
const knex = require('../index');
const { times, values } = require('lodash');

// Un-comment this code to enable Knex query error logging
// knex.on('query-error', (error, details) => {
//   console.error('Knex Query Error');
//   console.error(error, details);
// });

/**
 * Resets a provided table with the provided seed data
 */
const resetTable = (tableName, seed) => {
  // This is woefully naive, sorry in advanced
  if (seed instanceof Promise) {
    return seed.then(seedData =>
      knex(tableName)
        .delete()
        .then(() => knex(tableName).insert(values(seedData)))
    );
  }

  return knex(tableName)
    .delete()
    .then(() => knex(tableName).insert(values(seed)));
};

const sample = collectionOrObj => {
  const collection = values(collectionOrObj);
  return collection[casual.integer(0, collection.length - 1)];
};

const shuffle = collection => {
  const result = collection.slice();
  for (let i = result.length; i; i--) {
    const j = casual.integer(0, i);
    [result[i - 1], result[j]] = [result[j], result[i - 1]];
  }
  return result;
};

const sampleSize = (collectionOrObj, size) => {
  const collection = values(collectionOrObj);
  const shuffledIndexes = shuffle(times(collection.length, ix => ix));
  return times(size, ix => collection[shuffledIndexes[ix]]);
};

const dateAfterDate = (
  startDate,
  number = casual.integer(1, 15),
  timeframe = 'months'
) =>
  moment
    .utc(startDate)
    .add(number, timeframe)
    .toISOString();

module.exports = {
  resetTable,
  shuffle,
  sample,
  sampleSize,
  dateAfterDate,
};
