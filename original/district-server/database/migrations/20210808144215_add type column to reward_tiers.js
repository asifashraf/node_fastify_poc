const { rewardTierType } = require('../../src/schema/root/enums');

exports.up = function(knex) {
  return knex.schema.alterTable('reward_tiers', tableBuilder => {
    tableBuilder.enu('type', Object.values(rewardTierType), {
      useNative: true,
      enumName: 'reward_tier_type_enum',
    });
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('reward_tiers', tableBuilder => {
    tableBuilder.dropColumn('type');
  });
};
