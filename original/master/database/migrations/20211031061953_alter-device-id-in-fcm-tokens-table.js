exports.up = function (knex) {
  return knex.schema.alterTable('fcm_tokens', table => {
    table.string('device_id', 255).nullable().alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('fcm_tokens',table => {
    table.string('device_id', 255).notNullable().alter();
  });
};
