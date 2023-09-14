
const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = async knex => {
    await knex.raw(onUpdateTrigger('subscription_menu_items'));
};

exports.down = async knex => {
};
