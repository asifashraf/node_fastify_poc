const { formatError } = require('../../lib/util');
const { getLocalizedData, getLocalizedValue } = require('../../lib/util');
module.exports = {
  Query: {
    customerAccountDeletionReasonOptions(root, args, context) {
      return context.customerAccountDeletionReason.getAll();
    },
    customerAccountDeletionTexts(_, { language = 'EN' }, context) {
      return getLocalizedData(
        {
          pageTitle: { en: 'Delete Account', tr: 'Hesabı Sil' },
          description: { en: 'All data assossiated with your account will be permanently deleted including Reward Points, Wallet and Past orders. Once deleted, this information cannot be retrived.' },
          buttonPrimary: { en: 'Delete Account' },
          buttonSecondary: { en: 'Back to home' },
          confirmationTitle: { en: 'Account deleted'},
          confirmationDescription: { en: 'If you change your mind you can recover your account in the next 10 days by logging into COFE App'},
          confirmationButton: { en: 'Got it!'},
        },
        language,
        [
          'pageTitle',
          'description',
          'buttonPrimary',
          'buttonSecondary',
          'confirmationTitle',
          'confirmationDescription',
          'confirmationButton'
        ]
      );
    },
  },
  Mutation: {
    async saveCustomerAccountDeletionReasonOptions(_, { input }, context) {
      const validationResult = context.customerAccountDeletionReason.validate(
        input,
      );

      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }

      return context.customerAccountDeletionReason.save(input);
    },
  },
  CustomerAccountDeletionReasonOption: {
    reason({ reason }, { language = 'EN' }, context) {
      return getLocalizedValue(reason, language);
    },
    reasonTranslations({ reason }, _, context) {
      return reason;
    },
  },
};
