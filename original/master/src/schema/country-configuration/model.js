const { isArray } = require('lodash');
const { redisTimeParameter } = require('../../../config');
const { transformToCamelCase } = require('../../lib/util');
const redis = require('../../../redis');
const { countryConfigInfoByKey } = require('../../../redis/keys');

const BaseModel = require('../../base-model');
const {
  countryConfigurationGroupedDefaultValues,
} = require('./default-configurations');
const { countryConfigurationKeys, countryConfigurationChatWithUsEnums } = require('../root/enums');

class CountryConfiguration extends BaseModel {
  constructor(db, context) {
    super(db, 'country_configuration', context);
  }

  async saveOrUpdateByCountryId(params) {
    const existingConfiguration = await this.getByKey(
      params.configurationKey,
      params.countryId
    );
    if (existingConfiguration) {
      params.id = existingConfiguration.id;
    }
    return this.save(params);
  }

  saveByCountryId(countryId, configKey, configValue) {
    return super.save({
      countryId,
      configurationKey: configKey,
      configurationValue: configValue,
      enabled: true,
    });
  }

  updateByCountryIdAndKey(countryId, configKey, newValue) {
    return this.db(this.tableName)
      .where('country_id', countryId)
      .andWhere('configuration_key', configKey)
      .update('configuration_value', newValue);
  }

  async getByKey(configurationKey, countryId) {
    const query = this.roDb(this.tableName)
      .where('configuration_key', configurationKey)
      .andWhere('country_id', countryId)
      .limit(1);
    const [configuration] = await this.context.sqlCache(
      query,
      redisTimeParameter.oneHourInSeconds
    );
    return configuration;
  }

  async getByKeys(configurationKeys, countryId) {
    let query = this.roDb(this.tableName).where('country_id', countryId);
    if (configurationKeys && isArray(configurationKeys)) {
      query = query.whereIn('configuration_key', configurationKeys);
    }
    // return this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds);
    return query;
  }
  async getGroupedConfigurationsByCountryId(countryId) {
    const configurations = await this.roDb(this.tableName).where(
      'country_id',
      countryId
    );
    return countryConfigurationGroupedDefaultValues.map(configurationsGroup => {
      return {
        ...configurationsGroup,
        configurations: configurationsGroup.configurations.map(
          defaultConfiguration => {
            const dbConfiguration = configurations.find(
              ({ configurationKey }) =>
                configurationKey === defaultConfiguration.key
            ) || {
              configurationKey: defaultConfiguration.key,
              configurationValue: defaultConfiguration.value,
            };
            return {
              ...dbConfiguration,
              ...defaultConfiguration,
            };
          }
        ),
      };
    });
  }
  async getActiveCountryConfigurations() {
    const query = `SELECT c.id as country_id, cc.configuration_key as "key" , cc.configuration_value as "value" , cc.enabled
                    FROM countries c
                    join country_configuration cc on cc.country_id = c.id
                    where c.status = 'ACTIVE'
                    order by c.id asc`;
    const queryResults = await this.roDb
      .raw(query)
      .then(result => transformToCamelCase(result.rows));
    const results = {};
    queryResults.forEach(countryConfig => {
      const currentCountryId = countryConfig.countryId;
      // eslint-disable-next-line no-prototype-builtins
      if (!results.hasOwnProperty(currentCountryId)) {
        results[currentCountryId] = [];
      }
      delete countryConfig.countryId;
      results[currentCountryId].push(countryConfig);
    });
    const returnResults = [];
    for (let i = 0; i < Object.keys(results).length; i++) {
      const countryId = Object.keys(results)[i];
      returnResults.push({
        countryId,
        configs: results[countryId],
      });
    }
    return returnResults;
  }

  async getByKeyValue(configurationKey, configurationValue) {
    const redisKey = countryConfigInfoByKey({
      key: configurationKey
    });
    const cachedConfig = await redis.get(redisKey);
    if (cachedConfig) {
      return JSON.parse(cachedConfig);
    }
    const configuration = await this.roDb(this.tableName)
      .where('configuration_key', configurationKey)
      .andWhere('configuration_value', configurationValue);
    await redis.set(redisKey, JSON.stringify(configuration));
    return configuration;
  }

  async countryConfigurationChatWithUsPayload({ countryId }) {
    const callWithUsOptionMappings = [
      {
        isEnabled: true,
        chatWithUsType: countryConfigurationChatWithUsEnums.CALL_US,
        countryConfigurationKey: countryConfigurationKeys.CHAT_WITH_US_CALL_US_OPTION_ENABLED,
        label: {
          en: 'Call us',
          ar: 'اتصل علينا',
          tr: 'Bizi ara',
        },
        icon: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/account-screen/chat-with-us-call-us.png',
      },
      {
        isEnabled: true,
        chatWithUsType: countryConfigurationChatWithUsEnums.LIVE_CHAT,
        countryConfigurationKey: countryConfigurationKeys.CHAT_WITH_US_LIVE_CHAT_OPTION_ENABLED,
        label: {
          en: 'Live chat',
          ar: 'المحادثة الفورية',
          tr: 'Canlı Sohbet',
        },
        icon: 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/account-screen/chat-with-us-live-chat.png',
      },
    ];

    const configurations = await this.getByKeys(callWithUsOptionMappings.map(t => t.countryConfigurationKey), countryId);
    callWithUsOptionMappings.map(callWithUsMappingOption => {
      const cfg = configurations.find(t => t.configurationKey === callWithUsMappingOption.countryConfigurationKey);
      if (cfg) {
        callWithUsMappingOption.isEnabled = cfg.configurationValue === 'true';
      }
    });

    const payload = {
      isEnabled: true, // TODO: In future we can manage it by this flag
      title: {
        en: 'Chat with us',
        ar: 'دردش معنا',
        tr: 'Bize ulaş',
      },
      options: callWithUsOptionMappings.filter(t => t.isEnabled === true),
    };

    return payload;
  }
}

module.exports = CountryConfiguration;
