/* eslint-disable camelcase */

// Rewards: script from back end for existing users to be on the same tiers after the revamp (updating tiers points) for Toby's

const knex = require('../../database');
const { map } = require('lodash');
const { uuid, transformToCamelCase } = require('../lib/util');
const { env } = require('../../config');

console.log('Running: set-score-rating-to-brand-location-score-fulfillment-table.js');

knex
  .transaction(async trx => {
    const query = `
    SELECT brand_location_id, fulfillment_type, count(*) as total_reviews, SUM(rating) as total_score
    from order_rating GROUP BY (brand_location_id, fulfillment_type);
`;

    const data = map(
      await new Promise((resolve, reject) => {
        trx
          .raw(query)
          .then(({ rows }) => resolve(rows))
          .catch(err => reject(err));
      }).then(transformToCamelCase),
      n => {
        n.totalScore = Number(n.totalScore);
        n.totalReviews = Number(n.totalReviews);
        return n;
      }
    );
    console.log('Checking data');
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Records', data.length);
      const newEntries = map(data, d => {
        const id = uuid.get();
        return trx('brand_location_score_fulfillment').insert({
          id,
          brand_location_id: d.brandLocationId,
          total_score: d.totalScore,
          total_reviews: d.totalReviews,
          fulfillment_type: d.fulfillmentType,
        });
      });
      await Promise.all(newEntries);
    } else {
      console.log('Data not found');
    }
  })
  .then(() => {
    console.log('All done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
