const { cofePaymentErrors } = require('../error-model');

const myFatoorahErrorCodeMatrix = {
  MF001: {
    ...cofePaymentErrors.CARD_3DS_ISSUE,
    providerCode: 'MF001'
  },
  MF002: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 'MF002'
  },
  MF003: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 'MF003'
  },
  MF004: {
    ...cofePaymentErrors.INSUFFICIENT_FUNDS,
    providerCode: 'MF004'
  },
  MF005: {
    ...cofePaymentErrors.SESSION_TIMEOUT,
    providerCode: 'MF005'
  },
  MF006: {
    ...cofePaymentErrors.CANCELED,
    providerCode: 'MF006'
  },
  MF007: {
    ...cofePaymentErrors.EXPIRED_CARD,
    providerCode: 'MF007'
  },
  MF008: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 'MF008'
  },
  MF009: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 'MF009'
  },
  MF010: {
    ...cofePaymentErrors.INVALID_CARD_NUMBER,
    providerCode: 'MF010'
  },
  MF020: {
    ...cofePaymentErrors.DECLINED,
    providerCode: 'MF020'
  },
};

const findErrorCode = providerCode => {
  return myFatoorahErrorCodeMatrix[providerCode] || {
    ...cofePaymentErrors.UNSPECIFIED_ERRORS,
    providerCode
  };
};

module.exports = {
  findErrorCode
};
