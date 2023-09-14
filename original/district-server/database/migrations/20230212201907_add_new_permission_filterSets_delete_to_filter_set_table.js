const uuid = require('uuid');

exports.up = async function(knex) {
  await knex('permissions').insert({
    id: uuid.v4(),
    name: 'filterSets:delete',
    description: 'Can delete Filter Set(s)',
  });
};

exports.down = async function(knex) {
};
