const axios = require('axios');
const { brazeConfig, enableBrazeEvents } = require('../../config');
module.exports.publishVerifiedEmailToBraze = function (
  brazeAttributes,
  brazeEvents
) {
  if (!enableBrazeEvents) return false;

  let customerId = 0;
  let body = {};
  const attributesArray = [];
  const eventsArray = [];
  if (brazeAttributes !== 'undefined' && brazeAttributes !== null) {
    customerId = brazeAttributes.customerId;
    delete brazeAttributes.customerId;
    attributesArray.push(brazeAttributes);
  }
  if (brazeEvents !== 'undefined' && brazeEvents !== null) {
    customerId = brazeEvents.external_id;
    eventsArray.push(brazeEvents);
  }
  body = {
    externalId: customerId,
    attributes: attributesArray,
    events: eventsArray,
  };

  axios.post(brazeConfig.brazeServiceURL, body).catch(err => {
    console.log('error from braze', err);
  });
};
