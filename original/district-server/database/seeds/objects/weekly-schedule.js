/* eslint-disable camelcase */
const casual = require('casual');

const twentyFourSeven = [
  {
    day: 1,
    open_time: null,
    open_duration: null,
    open_all_day: true,
    delivery_open_time: null,
    delivery_open_duration: null,
  },
  {
    day: 2,
    open_time: null,
    open_duration: null,
    open_all_day: true,
    delivery_open_time: null,
    delivery_open_duration: null,
  },
  {
    day: 3,
    open_time: null,
    open_duration: null,
    open_all_day: true,
    delivery_open_time: null,
    delivery_open_duration: null,
  },
  {
    day: 4,
    open_time: null,
    open_duration: null,
    open_all_day: true,
    delivery_open_time: null,
    delivery_open_duration: null,
  },
  {
    day: 5,
    open_time: null,
    open_duration: null,
    open_all_day: true,
    delivery_open_time: null,
    delivery_open_duration: null,
  },
  {
    day: 6,
    open_time: null,
    open_duration: null,
    open_all_day: true,
    delivery_open_time: null,
    delivery_open_duration: null,
  },
  {
    day: 7,
    open_time: null,
    open_duration: null,
    open_all_day: true,
    delivery_open_time: null,
    delivery_open_duration: null,
  },
];

const regularBusiness = [
  {
    day: 2,
    open_time: '09:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '09:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 3,
    open_time: '09:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '09:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 4,
    open_time: '09:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '09:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 5,
    open_time: '09:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '09:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 6,
    open_time: '09:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '09:00',
    delivery_open_duration: 8 * 60,
  },
];

const sevenLateNights = [
  {
    day: 1,
    open_time: '06:00',
    open_duration: 20 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 20 * 60,
  },
  {
    day: 2,
    open_time: '06:00',
    open_duration: 20 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 20 * 60,
  },
  {
    day: 3,
    open_time: '06:00',
    open_duration: 20 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 20 * 60,
  },
  {
    day: 4,
    open_time: '06:00',
    open_duration: 20 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 20 * 60,
  },
  {
    day: 5,
    open_time: '06:00',
    open_duration: 20 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 20 * 60,
  },
  {
    day: 6,
    open_time: '06:00',
    open_duration: 20 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 20 * 60,
  },
  {
    day: 7,
    open_time: '06:00',
    open_duration: 20 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 20 * 60,
  },
];

const brunchPlace = [
  {
    day: 1,
    open_time: '06:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 2,
    open_time: '06:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 3,
    open_time: '06:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 4,
    open_time: '06:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 5,
    open_time: '06:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 6,
    open_time: '06:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 8 * 60,
  },
  {
    day: 7,
    open_time: '06:00',
    open_duration: 8 * 60,
    open_all_day: false,
    delivery_open_time: '06:00',
    delivery_open_duration: 8 * 60,
  },
];

module.exports = brandLocations => {
  const schedules = [];

  const pushTemplates = (brandLocation, template) => {
    template.forEach(schedule => {
      const copy = Object.assign({}, schedule);
      copy.id = casual.uuid;
      copy.brand_location_id = brandLocation.id;
      schedules.push(copy);
    });
  };

  pushTemplates(brandLocations.caribou1, regularBusiness);
  pushTemplates(brandLocations.caribou2, regularBusiness);
  pushTemplates(brandLocations.caribou3, regularBusiness);

  pushTemplates(brandLocations.costa1, brunchPlace);
  pushTemplates(brandLocations.costa2, brunchPlace);
  pushTemplates(brandLocations.costa3, brunchPlace);

  pushTemplates(brandLocations.starbucks1, sevenLateNights);
  pushTemplates(brandLocations.starbucks2, sevenLateNights);
  pushTemplates(brandLocations.starbucks3, twentyFourSeven);

  return schedules;
};
