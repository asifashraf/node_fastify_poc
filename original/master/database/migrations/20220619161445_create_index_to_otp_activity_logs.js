exports.up = function (knex) {
  return knex.schema.raw(
    `CREATE INDEX otp_activity_logs_identifier_idx ON public.otp_activity_logs (identifier);`
  )
}

exports.down = async function (knex) {
  await knex.schema.raw(`DROP INDEX public.otp_activity_logs_identifier_idx;`);
};
