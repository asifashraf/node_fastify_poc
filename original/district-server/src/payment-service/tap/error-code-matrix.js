const { cofePaymentErrors } = require('../error-model');

const tapErrorCodeMatrix = {
  302: {
    ...cofePaymentErrors.CANCELED,
  },
  304: {
    ...cofePaymentErrors.SESSION_TIMEOUT,
  },
  801: {
    ...cofePaymentErrors.SESSION_TIMEOUT,
  },
  503: {
    ...cofePaymentErrors.CARD_3DS_ISSUE,
  },
  504: {
    ...cofePaymentErrors.CARD_3DS_ISSUE,
  },
  407: {
    ...cofePaymentErrors.EXPIRED_CARD,
  },
  405: {
    ...cofePaymentErrors.INVALID_CARD_NUMBER,
  },
  406: {
    ...cofePaymentErrors.INVALID_CARD_NUMBER,
  },
  505: {
    ...cofePaymentErrors.INSUFFICIENT_FUNDS,
  },
  701: {
    ...cofePaymentErrors.RESTRICTED_CARD,
  },
  702: {
    ...cofePaymentErrors.RESTRICTED_CARD,
  },
  703: {
    ...cofePaymentErrors.RESTRICTED_CARD,
  },
  704: {
    ...cofePaymentErrors.RESTRICTED_CARD,
  },
  501: {
    ...cofePaymentErrors.DECLINED,
  },
  502: {
    ...cofePaymentErrors.DECLINED,
  },
  506: {
    ...cofePaymentErrors.DECLINED,
  },
  507: {
    ...cofePaymentErrors.DECLINED,
  },
  508: {
    ...cofePaymentErrors.DECLINED,
  },
  509: {
    ...cofePaymentErrors.DECLINED,
  },
  510: {
    ...cofePaymentErrors.DECLINED,
  },
  511: {
    ...cofePaymentErrors.DECLINED,
  },
  512: {
    ...cofePaymentErrors.DECLINED,
  },
  513: {
    ...cofePaymentErrors.DECLINED,
  },
  514: {
    ...cofePaymentErrors.DECLINED,
  },
  515: {
    ...cofePaymentErrors.DECLINED,
  },
  516: {
    ...cofePaymentErrors.DECLINED,
  },
};

const findErrorCode = providerCode => {
  return tapErrorCodeMatrix[providerCode] || {
    ...cofePaymentErrors.UNSPECIFIED_ERRORS,
    providerCode
  };
};

module.exports = {
  findErrorCode
};
