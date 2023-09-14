
const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = async knex => {
    await knex.raw(onUpdateTrigger('subscription_brands'));
};

exports.down = async knex => {
};
