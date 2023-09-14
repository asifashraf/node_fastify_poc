const { authyApiKey, isTest } = require('../../config');
const { Client, enums } = require('authy-client');
const authy = isTest || new Client({ key: authyApiKey });

const startPhoneVerificationViaSMS = (countryCode, phone) => {
  const params = {
    countryCode,
    locale: 'en',
    phone,
    via: enums.verificationVia.SMS,
  };
  return authy.startPhoneVerification(params).then(response => {
    /*
    {
      "carrier":"AT&T Wireless",
      "is_cellphone":true,
      "message":"Text message sent to +1 615-719-0690.",
      "seconds_to_expire":599,
      "uuid":"e83fd1e0-be87-0135-ff76-123a695aec42",
      "success":true
    }
    */
    return response.success || false;
  });
};

const verifyPhoneVerificationToken = (token, countryCode, phone) => {
  const params = {
    countryCode,
    phone,
    token,
  };
  return authy.verifyPhone(params).then(response => {
    /*
    {
      "message":"Verification code is correct.",
      "success":true
    }
    */
    return response.success || false;
  });
};

module.exports = {
  startPhoneVerificationViaSMS,
  verifyPhoneVerificationToken,
};
