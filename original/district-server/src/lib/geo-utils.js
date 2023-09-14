const geohash = require('ngeohash');
const calculateGeohashFromLatLon = (latitude, longitude, precision = 7) => {
  return geohash.encode(latitude, longitude, precision);
};

module.exports = {
  calculateGeohashFromLatLon,
};
