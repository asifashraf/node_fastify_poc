
const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = async knex => {
    await knex.raw(onUpdateTrigger('subscriptions'));
};

exports.down = async knex => {
};
