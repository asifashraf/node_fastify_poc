const { setupAuthContext } = require('../helpers/context-helpers');
const { singleSignOnStatusName } = require('../schema/root/enums');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const jwtDecode = require('jwt-decode');

const customerOtp = async (req, res) => {
  try {

    const { body } = req;

    const { phoneNumber } = body;

    if (!phoneNumber && phoneNumber == undefined) {
      return res.status(401).send({ error: 'Phone Number is required' });
    }

    const context = await setupAuthContext(req);

    const [otpProcess, providerInfos] = await Promise.all([
      context.internalAuthService.otpProcess({
        phoneNumber,
        isAdmin: false,
        cancelAccountDeletion: false
      }),
      context.internalAuthService.otpInformationByPhone({ context, phoneNumber }),
    ]);

    res.status(200).send({ ...otpProcess, providerInfos });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const validateCustomerOtp = async (req, res) => {
  try {

    const { body } = req;

    const { phoneNumber, otpCode } = body;

    if (!phoneNumber && phoneNumber == undefined) {
      return res.status(401).send({ error: 'Phone Number is required' });
    }

    if (!otpCode && otpCode == undefined) {
      return res.status(401).send({ error: 'Otp is required' });
    }

    const context = await setupAuthContext(req);

    const validation = await context.internalAuthService.validatePhoneOTP(phoneNumber, otpCode);

    if (validation.status === singleSignOnStatusName.SUCCESS_EXISTING_USER) {
      try {
        const decodedJwt =
          validation.token && validation.token.accessToken
            ? jwtDecode(validation.token.accessToken)
            : null;
        let customer = {};
        if (decodedJwt && decodedJwt.jti) {
          const customerId = decodedJwt.jti; // from authService
          customer = await context
            .roDb(context.customer.tableName)
            .where('id', customerId)
            .first();
        } else {
          customer = await context.customer.getByPhoneNumber(phoneNumber);
        }
        if (customer && !customer.isPhoneVerified) {
          customer.isPhoneVerified = true;
          await context.customer.update(customer);
        }
      } catch (err) {
        SlackWebHookManager.sendTextAndErrorToSlack(
          `CustomerValidateOTPViaPhoneNumber is failed for this customer : Number: ${phoneNumber} | Otp: ${otpCode}`,
          err
        );
      }
    }

    res.status(200).send(validation);

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const availableCountries = async (req, res) => {
  try {

    const context = await setupAuthContext(req);

    const optCountries = await context.otpAvailableCountries.getAll();

    res.status(200).send({ optCountries });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

module.exports = {
  customerOtp,
  validateCustomerOtp,
  availableCountries
};
