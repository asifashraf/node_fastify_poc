const express = require('express');
const { notificationFulfillmentList } = require('../notifications/enums');

const EMAIL_REGEX = /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

// eslint-disable-next-line new-cap
const router = express.Router();

router.route('/contact-us').post(async (req, res) => {
  const { body } = req;
  let {
    name = '',
    email = '',
    phoneNumber = '',
    subject = '',
    content = '',
    newsletter = false,
  } = body;

  name = name.trim();
  email = email.trim();
  phoneNumber = phoneNumber.trim();
  subject = subject.trim();
  content = content.trim();
  newsletter = newsletter === true;

  if (
    email === '' ||
    phoneNumber === '' ||
    content === '' ||
    typeof newsletter !== 'boolean'
  ) {
    return res.send({ success: false, message: 'Invalid request' });
  }

  const { queryContextWithoutAuth: context } = req.app;
  const response = await context.contactUs.contact({
    name,
    email,
    phoneNumber,
    subject,
    content,
    newsletter,
  });

  return res.send(response);
  //   return res.redirect(response);
});

router.route('/become-a-partner').post(async (req, res) => {
  const { body } = req;
  let {
    name = '',
    shopName = '',
    email = '',
    phoneNumber = '',
    country = '',
    businessType = '',
    locationsCount = '',
    fulfillmentServices = [],
    menuUrl = '',
    instagram = '',
    coffeeKeyFeature = false,
    termsConditions = false,
    gdprGuidelines = false,
  } = body;

  name = name.trim();
  shopName = shopName.trim();
  email = email.trim();
  phoneNumber = phoneNumber.trim();
  country = country.trim();
  businessType = businessType.trim();
  locationsCount = locationsCount.trim();
  menuUrl = menuUrl.trim();
  instagram = instagram.trim();
  coffeeKeyFeature = coffeeKeyFeature === true;
  termsConditions = termsConditions === true;
  gdprGuidelines = gdprGuidelines === true;
  const services = [];
  for (const fulfillment in notificationFulfillmentList) {
    if (fulfillmentServices.some(value => value.toUpperCase() === fulfillment))
      services.push(fulfillment);
  }
  fulfillmentServices = services.join();
  if (
    name === '' ||
    email === '' ||
    phoneNumber === '' ||
    shopName === '' ||
    country === '' ||
    businessType === '' ||
    locationsCount === '' ||
    fulfillmentServices === ''
  ) {
    return res.send({ success: false, message: 'Invalid request' });
  }
  if (!email.match(EMAIL_REGEX)) {
    return res.send({ success: false, message: 'Invalid email address' });
  }
  const { queryContextWithoutAuth: context } = req.app;
  const countryISO = country;
  const chosenCountry = await context.country.getByCode(country);

  if (!chosenCountry) {
    return res.send({ success: false, message: 'Invalid country code' });
  }

  country = chosenCountry.name.en;
  const response = await context.partnerRequest.request({
    name,
    shopName,
    email,
    phoneNumber,
    country,
    countryISO,
    businessType,
    locationsCount,
    fulfillmentServices,
    menuUrl,
    instagram,
    coffeeKeyFeature,
    termsConditions,
    gdprGuidelines,
  });
  return res.send(response);
  //   return res.redirect(response);
});

module.exports = router;
