const uuid = require('uuid');

const tableName = 'country_configuration';
const configurationKey = 'CHAT_WITH_US_CALL_US_OPTION_ENABLED';

exports.up = async function(knex) {
  const getAllCountries = () => knex('countries');
  const countries = await getAllCountries();
  const configurationsArr = countries.map((country) => {
    return {
      id: uuid.v4(),
      country_id: country.id,
      configuration_key: configurationKey,
      configuration_value: 'true',
      enabled: true,
    };
  });
  await knex(tableName).insert(configurationsArr);
};

exports.down = async function(knex) {
  await knex(tableName).where('configuration_key', configurationKey).del();
};
