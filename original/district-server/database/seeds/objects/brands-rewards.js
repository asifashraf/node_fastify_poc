/* eslint-disable camelcase */
module.exports = (brands, rewards) => {
  return [
    {
      brand_id: brands.caribou.id,
      reward_id: rewards.caribouReward.id,
      main: true,
    },
  ];
};
