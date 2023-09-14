const { addLocalizationField } = require('../../lib/util');
const { statusTypes } = require('./../root/enums');
module.exports = {
  Country: {
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
    async cities(
      { id },
      { filters = { status: statusTypes.ACTIVE } },
      context
    ) {
      return context.city.getByCountry(id, filters);
    },
    async addressFields({ isoCode }, args, context) {
      return context.addressField.getAllByCountryCode(isoCode);
    },
    async countryBanks({ id }, args, context) {
      return context.bank.getAllByCountryId(id);
    },
    hasVat({ vat, vatId }) {
      return Boolean(parseFloat(vat)) && Boolean(vatId);
    },
    async countryConfig({ id }, args, context) {
      return context.countryConfiguration.getByKeys(args.configurationKeys, id);
    },
    senderReferralAmount({ senderReferralAmount }) {
      if (!senderReferralAmount) {
        return senderReferralAmount;
      }
      const n = Number.parseFloat(senderReferralAmount)
        .toFixed(3)
        .split('.');
      if (Number.parseInt(n[1], 10) === 0) {
        n.pop();
      }
      return n.join('.');
    },
    groupedCountryConfigurations({ id }, _, context) {
      return context.sqlCache(
        context.countryConfiguration.getGroupedConfigurationsByCountryId(id)
      );
    },
  },
};
