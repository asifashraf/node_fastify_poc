exports.up = async function(knex) {
  await knex('permissions').insert({
    id: '111104a8-778b-41bb-a252-a38a440e9373',
    name: 'driver:delete',
    description: 'Can delete driver(s)',
  });
};

exports.down = async function(knex) {
  await knex('permissions').delete({
    id: '111104a8-778b-41bb-a252-a38a440e9373',
  });
};
