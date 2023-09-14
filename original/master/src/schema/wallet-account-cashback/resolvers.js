const moment = require('moment');
const { addLocalizationField } = require('../../lib/util');
module.exports = {
  WalletAccountCashback: {
    expiresOn({ expiresOn }) {
      // expiresOn is unix time
      if (expiresOn) {
        return moment.unix(expiresOn).format('YYYY-MM-DDTHH:mm:ssZ');
      }
      return null;
    },
    coupon({ couponId }, args, context) {
      if (couponId) {
        return context.coupon.getById(couponId);
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
