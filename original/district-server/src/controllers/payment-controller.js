const {
  setupAuthContext,
  setupQueryContextWithoutAuth
} = require('../helpers/context-helpers');

const getPaymentMethods = async (req, res) => {
  try {

    const { body } = req;

    const { customerId, countryCode } = body;

    if (!customerId && customerId == undefined) {
      return res.status(401).send({ error: 'Customer Id is required' });
    }

    if (!countryCode && countryCode == undefined) {
      return res.status(401).send({ error: 'Country Code is required' });
    }

    const context = await setupAuthContext(req);

    const customer = await context.customer.getById(customerId);

    if (!customer) {
      return res.status(401).send({ error: 'Invalid Customer ID' });
    }

    const includeCash = true;

    const paymentMethods = await context.paymentService.getPaymentMethods({
      countryCode, customerId, includeCash, platform: 'ECOM',
    });

    const { errors } = paymentMethods;

    if (errors && errors.length > 0) {
      return res.status(401).send({ error: errors[0] });
    }

    res.status(200).send({ paymentMethods });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const getWalletAccount = async (req, res) => {
  try {

    const { body } = req;

    const { customerId, countryCode } = body;

    if (!customerId && customerId == undefined) {
      return res.status(401).send({ error: 'Customer Id is required' });
    }

    if (!countryCode && countryCode == undefined) {
      return res.status(401).send({ error: 'Country Code is required' });
    }

    const context = await setupAuthContext(req);

    const customer = await context.customer.getById(customerId);

    if (!customer) {
      return res.status(401).send({ error: 'Invalid Customer ID' });
    }

    const country = await context.country.getByIsoCode(countryCode);

    if (!country) {
      return res.status(401).send({ error: 'Invalid Country Code' });
    }

    const { id } = country;
    const countryId = id;

    const walletAccount = await context.walletAccount.getWalletAccount({
      customerId,
      countryId
    });

    res.status(200).send({ walletAccount });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const createTx = async (req, res) => {
  const serverConfig = req.serverConfig;

  const { body } = req;

  const { payment, metadata } = body;

  const {
    language,
    creditsUsed,
    referenceOrderId,
    externalCustomerId,
    internalCustomerId,
    customerPhoneNumber,
    giftCardCreditsUsed = 0,
    discoveryCreditUsed = 0
  } = metadata;

  const {
    paymentType,
    paymentScheme,
    sourceId,
    cvv,
    amountDue,
    isoCurrencyCode,
    isoCountryCode
  } = payment;

  const context = setupQueryContextWithoutAuth(serverConfig);

  const paymentService = context.paymentService;

  const methods = ({
    async CASH(paymentMethods) {
      return await paymentMethods.CREDIT();
    },
    async CREDIT(isCash = true) {
      //TODO - if wallet = 0 ?
      let creditsConsumed = Number(creditsUsed);

      let responseData = null;

      const currency = await context.currency.getByCode(isoCurrencyCode);

      if (creditsConsumed > 0) {

        const country = await context.country.getByIsoCode(isoCountryCode);

        const { id } = country;
        const countryId = id;

        const walletAccount = await context.walletAccount.getWalletAccount({
          customerId: internalCustomerId,
          countryId
        });

        if (creditsConsumed >= walletAccount.total) {
          if (walletAccount.total >= 0) {
            creditsConsumed = walletAccount.total;
          } else {
            creditsConsumed = 0;
          }
        }

        const currencyId = currency.id;

        const orderType = 'ECOM';

        const { regular } = await context.walletAccount.debit(
          internalCustomerId,
          currencyId,
          creditsConsumed,
          orderType
        );

        if (regular && Number(regular) > 0) {

          await context.loyaltyTransaction.save({
            referenceOrderId,
            orderType,
            debit: regular,
            customerId: internalCustomerId,
            currencyId,
          });

          responseData = {
            status: 'PAYMENT_SUCCESS',
            response: { walletDeduction: regular },
            deduction: true
          };
        } else {
          responseData = {
            status: 'PAYMENT_FAILURE',
            response: { walletDeduction: 0 },
            deduction: false
          };
        }
      }

      if (!isCash) return responseData.deduction;

      return responseData;
    },
    async CARD() {

      const country = await context.country.getByIsoCode(isoCountryCode);

      const { id } = country;
      const countryId = id;

      const paymentResponse = await paymentService.pay({
        language,
        currencyCode: isoCurrencyCode,
        countryCode: isoCountryCode,
        amount: amountDue,
        creditsUsed,
        giftCardCreditsUsed,
        discoveryCreditUsed,
        paymentMethod: {
          paymentScheme,
          sourceId,
          cvv
        },
        referenceOrderId,
        orderType: 'ECOM',
        customerId: internalCustomerId,
        customerPhoneNumber,
        isEnabled3ds: true,
        countryId
      });

      if (paymentResponse.error) {
        return {
          status: 'PAYMENT_FAILURE',
          response: paymentResponse,
          deduction: false,
        };
      }

      return {
        status: 'PAYMENT_SUCCESS',
        response: paymentResponse,
        deduction: false
      };
    },
    APPLE_PAY: () => { throw new Error('APPLE_PAY not implemented'); },
    GOOGLE_PAY: () => { throw new Error('GOOGLE_PAY not implemented'); }
  });

  try {
    const method = methods[paymentType] || null;

    if (method === null) throw new Error(`Non implemented payment method ${paymentType}`);

    const {
      status,
      response,
      deduction
    } = await method(methods);

    const data = {
      payment: {
        ...response,
      },
      internalCustomerId,
      externalCustomerId,
      status,
      deduction
    };

    return res.status(200).send(data);
  } catch (ex) {
    const { stack, message } = ex || {};

    return res.status(400).send({
      status: 'PAYMENT_FAILURE',
      errorResponse: {
        stack,
        message
      }
    });
  }
};

module.exports = {
  createTx,
  getPaymentMethods,
  getWalletAccount
};
