const { addLocalizationField } = require('../../lib/util');
const moment = require('moment');

module.exports = {
  DiscoveryCredit: {
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
    expiresOn({ expiresOn }) {
      // discoveryAmountExpiresOn is unix time
      if (expiresOn) {
        return moment.unix(expiresOn).format('YYYY-MM-DDTHH:mm:ssZ');
      }
      return 0;
    },
    showInfoBar({ id, countryId }, args, context) {
      const customerId = context.auth.id;
      return context.discoveryCredit.showInfoBarOnMobile({
        id,
        countryId,
        customerId,
      });
    },
  },
};
