const moment = require('moment');
const { addLocalizationField } = require('../../lib/util');
module.exports = {
  WalletAccountReferral: {
    expiresOn({ expiresOn }) {
      // expiresOn is unix time
      if (expiresOn) {
        return moment.unix(expiresOn).format('YYYY-MM-DDTHH:mm:ssZ');
      }
      return null;
    },
    walletAccount({ walletAccountId }, args, context) {
      if (walletAccountId) {
        return context.walletAccount.getById(walletAccountId);
      }
      return null;
    },
    senderWalletAccount({ senderWalletAccountId }, args, context) {
      if (senderWalletAccountId) {
        return context.walletAccount.getById(senderWalletAccountId);
      }
      return null;
    },
    async currency({ walletAccountId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.walletAccount.getCurrency(walletAccountId),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
};
