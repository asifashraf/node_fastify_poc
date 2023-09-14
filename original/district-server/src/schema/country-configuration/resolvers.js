module.exports = {
  CountryConfiguration: {
    // eslint-disable-next-line no-unused-vars
    options: ({ options }, _, context) => {
      if (!options) return null;
      return options.split(',');
    },
  },
  CountryCurrencyLookupPayload: {
    countryConfigurationChatWithUsPayload({ countryId }, args, context) {
      return context.countryConfiguration.countryConfigurationChatWithUsPayload({ countryId });
    },
  },
};
