const sqs = require('./../../lib/sqs-base')('foodics');
const dataLinker = require('../foodics/foodics-linker');
module.exports = function FoodicsConsumer(queryContext) {
  const linker = dataLinker()(queryContext);
  const sqsConsumer = async ({ payload }) => {
    const { Body } = payload;
    try {
      const messageBody = JSON.parse(Body);
      const { entity } = messageBody;
      linker.link({ entity, data: messageBody })
        .then(result => console.info(`Entity [${entity}] linked result >`, result))
        .catch(ex => {
          const { stack, message } = ex || {};
          queryContext.kinesisLogger.sendLogEvent({ stack, message }, 'foodics-linker-exception');
          console.error('foodics-linker-exception >', { stack, message });
        });
    } catch (ex) {
      const { stack, message } = ex || {};
      queryContext.kinesisLogger.sendLogEvent({ stack, message }, 'foodics-consumer-exception');
    }
  };
  sqs.consume({ callback: sqsConsumer });
};
