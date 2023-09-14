const casual = require('casual');
const knex = require('../../database');
const {
  countryConfigurationDefaultValues,
} = require('../schema/country-configuration/default-configurations');

const getAllCountries = () => knex('countries');
const getCurrentConfigurations = () => knex('country_configuration');

(async () => {
  const countries = await getAllCountries();
  const currentConfigurations = await getCurrentConfigurations();

  const insertList = countryConfigurationDefaultValues.reduce(
    (insertList, defaultConfiguration) => {
      console.info(`-`.repeat(20));
      console.info(`Configration key: ${defaultConfiguration.key}`);
      console.info(`Configration key type: ${defaultConfiguration.type}`);
      console.info(
        `Configration key default value: ${defaultConfiguration.value}`
      );
      for (const country of countries) {
        const currentConfiguration = currentConfigurations.find(
          currentConfiguration =>
            currentConfiguration.country_id === country.id &&
            currentConfiguration.configuration_key === defaultConfiguration.key
        );
        if (currentConfiguration) {
          // we can change values if type changed
          continue;
        }

        insertList.push({
          id: casual.uuid,
          // eslint-disable-next-line camelcase
          country_id: country.id,
          // eslint-disable-next-line camelcase
          configuration_key: defaultConfiguration.key,
          // eslint-disable-next-line camelcase
          configuration_value: defaultConfiguration.value,
        });
        console.info(`added  for ${country.name} `);
      }
      console.info(`-`.repeat(20));
      return insertList;
    },
    []
  );
  await knex('country_configuration').insert(insertList);
  console.info(`${insertList.length} configurations successfully added`);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit();
})();
