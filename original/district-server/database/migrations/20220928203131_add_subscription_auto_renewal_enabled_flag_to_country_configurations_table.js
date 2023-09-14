const casual = require('casual');
exports.up = async function(knex) {
  const getAllCountries = () => knex('countries');
  const countries = await getAllCountries();
  const configurationsArr = countries.map((country) => {
    return {
      id: casual.uuid,
      country_id: country.id,
      configuration_key: 'SUBSCRIPTION_AUTO_RENEWAL_ENABLED',
      configuration_value: 'false',
      enabled: true
    }
  })
  console.log(countries, configurationsArr);
  await knex('country_configuration').insert(configurationsArr)
};

exports.down = async function(knex) {
  await knex('country_configuration').where('configuration_key', 'SUBSCRIPTION_AUTO_RENEWAL_ENABLED').del()
};
