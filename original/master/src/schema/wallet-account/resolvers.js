const moment = require('moment');
const { addLocalizationField } = require('../../lib/util');

module.exports = {
  WalletAccount: {
    referralAmountExpiresOn({ referralAmountExpiresOn }) {
      // referralAmountExpiresOn is unix time
      if (referralAmountExpiresOn) {
        return moment
          .unix(referralAmountExpiresOn)
          .format('YYYY-MM-DDTHH:mm:ssZ');
      }
      return null;
    },
    discoveryAmountExpiresOn({ discoveryAmountExpiresOn }) {
      // discoveryAmountExpiresOn is unix time
      if (discoveryAmountExpiresOn) {
        // const date = moment.unix(discoveryAmountExpiresOn);
        // if (timeZoneIdentifier) date.tz(timeZoneIdentifier);
        return moment
          .unix(discoveryAmountExpiresOn)
          .format('YYYY-MM-DDTHH:mm:ssZ');
      }
      return null;
    },
    cashbackAmountExpiresOn({ cashbackAmountExpiresOn }) {
      // cashbackAmountExpiresOn is unix time
      if (cashbackAmountExpiresOn) {
        return moment
          .unix(cashbackAmountExpiresOn)
          .format('YYYY-MM-DDTHH:mm:ssZ');
      }
      return null;
    },
    cashbacks({ id }, args, context) {
      // referralAmountExpiresOn is unix time
      if (id) {
        return context.walletAccountCashback.getRemainedByWalletAccountId(id);
      }
      return [];
    },
    nearestCashback({ id }, args, context) {
      if (id) {
        return context.walletAccountCashback.getNearestRemainedByWalletAccountId(
          id
        );
      }
      return null;
    },
    referrals({ id }, args, context) {
      // referralAmountExpiresOn is unix time
      if (id) {
        return context.walletAccountReferral.getRemainedByWalletAccountId(id);
      }
      return null;
    },
    nearestReferral({ id }, args, context) {
      if (id) {
        return context.walletAccountReferral.getNearestRemainedByWalletAccountId(
          id
        );
      }
      return null;
    },
    dynamicCreditTypes(root, args, context) {
      if (root) {
        return context.walletAccount.dynamicCreditTypes(root);
      }
      return [];
    },
    // async regularAmount({ id, regularAmount }, args, context) {
    //   // referralAmountExpiresOn is unix time
    //   if (id && regularAmount) {
    //     const cashbacks = await context.walletAccountCashback.getRemainedByWalletAccountId(
    //       id
    //     );
    //     if (cashbacks && cashbacks.length > 0) {
    //       const totalCashback = sumBy(cashbacks, cb => Number(cb.amount));
    //       const currency = await context.walletAccount.getCurrency(id);
    //       return new CurrencyValue(
    //         Number(totalCashback) + Number(regularAmount),
    //         currency.decimalPlace,
    //         currency.lowestDenomination
    //       ).toCurrencyValue();
    //     }

    //     return regularAmount;
    //   }
    //   return regularAmount;
    // },
    async currency({ id }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.walletAccount.getCurrency(id),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
};
