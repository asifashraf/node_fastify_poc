/* eslint-disable no-undef,no-return-assign */
const casual = require('casual');
const times = require('lodash/times');

module.exports = () => {
  const nutritionalInfo = [];

  // This must match the number of menuItems we will have.
  times(24, () =>
    nutritionalInfo.push({
      id: casual.uuid,
      calories: casual.integer(0, 15),
      fat: casual.integer(0, 15),
      carbohydrates: casual.integer(0, 15),
      sugar: casual.integer(0, 15),
      protein: casual.integer(0, 15),
    })
  );

  return nutritionalInfo;
};
