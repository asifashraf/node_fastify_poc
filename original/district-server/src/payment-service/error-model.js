// if you update please update
// src/schema/payment-status/enums.graphql
const mainErrorType = {
  USER_ERROR: 'USER_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  UNSPECIFIED_ERROR: 'UNSPECIFIED_ERROR',
};

// if you update please update
// src/schema/payment-status/enums.graphql
const subErrorType = {
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CARD_3DS_ISSUE: 'CARD_3DS_ISSUE',
  EXPIRED_CARD: 'EXPIRED_CARD',
  INVALID_CARD_NUMBER: 'INVALID_CARD_NUMBER',
  RESTRICTED_CARD: 'RESTRICTED_CARD',
  LOST_OR_STOLEN_CARD: 'LOST_OR_STOLEN_CARD',
  DECLINED: 'DECLINED',
  UNSPECIFIED_ERRORS: 'UNSPECIFIED_ERRORS',
  CANCELED: 'CANCELED',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
};

const commonResponseMessages = {
  contactYourBank: {
    en: 'An error occurred while payment processing. ' +
      'Please contact your bank'
  },
  unspecifiedError: {
    en: 'An error occurred while payment processing.'
  }
};

const cofePaymentErrors = {
  SYSTEM_ERROR: {
    subErrorType: subErrorType.UNEXPECTED_ERROR,
    mainErrorType: mainErrorType.SYSTEM_ERROR,
    message: {
      en: 'Please contact with the team.'
    }
  },
  SESSION_TIMEOUT: {
    subErrorType: subErrorType.SESSION_TIMEOUT,
    mainErrorType: mainErrorType.USER_ERROR,
    message: {
      en: 'Session timeout'
    }
  },
  CANCELED: {
    subErrorType: subErrorType.CANCELED,
    mainErrorType: mainErrorType.USER_ERROR,
    message: {
      en: 'Transaction canceled'
    }
  },
  INSUFFICIENT_FUNDS: {
    subErrorType: subErrorType.INSUFFICIENT_FUNDS,
    mainErrorType: mainErrorType.USER_ERROR,
    message: {
      en: 'You don\'t have enough balance'
    }
  },
  CARD_3DS_ISSUE: {
    subErrorType: subErrorType.CARD_3DS_ISSUE,
    mainErrorType: mainErrorType.USER_ERROR,
    message: {
      en: '3DS should be enabled for payment card'
    }
  },
  EXPIRED_CARD: {
    subErrorType: subErrorType.EXPIRED_CARD,
    mainErrorType: mainErrorType.USER_ERROR,
    message: {
      en: 'Payment card expired'
    }
  },
  INVALID_CARD_NUMBER: {
    subErrorType: subErrorType.INVALID_CARD_NUMBER,
    mainErrorType: mainErrorType.USER_ERROR,
    message: {
      en: 'Invalid card number'
    }
  },
  RESTRICTED_CARD: {
    subErrorType: subErrorType.RESTRICTED_CARD,
    mainErrorType: mainErrorType.PROVIDER_ERROR,
    message: commonResponseMessages.contactYourBank,
  },
  LOST_OR_STOLEN_CARD: {
    subErrorType: subErrorType.LOST_OR_STOLEN_CARD,
    mainErrorType: mainErrorType.PROVIDER_ERROR,
    message: commonResponseMessages.contactYourBank,
  },
  DECLINED: {
    subErrorType: subErrorType.DECLINED,
    mainErrorType: mainErrorType.PROVIDER_ERROR,
    message: commonResponseMessages.contactYourBank,
  },
  UNSPECIFIED_ERRORS: {
    subErrorType: subErrorType.UNSPECIFIED_ERROR,
    mainErrorType: mainErrorType.UNSPECIFIED_ERROR,
    message: commonResponseMessages.unspecifiedError,
  },
};

const paymentErrorModel = ({
  mainErrorType = mainErrorType.UNSPECIFIED_ERRORS,
  subErrorType = subErrorType.UNSPECIFIED_ERRORS.value,
  providerCode = null,
  providerDescription = null,
}) => ({
  mainErrorType,
  subErrorType,
  providerCode,
  providerDescription,
});

module.exports = {
  paymentErrorModel,
  subErrorType,
  mainErrorType,
  cofePaymentErrors
};
