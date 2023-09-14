exports.up = knex =>
  knex.schema.raw('ALTER TABLE payment_statuses ADD COLUMN sequence SERIAL');

exports.down = knex =>
  knex.schema.table('payment_statuses', t => t.dropColumn('sequence'));
