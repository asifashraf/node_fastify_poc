const { statusTypes } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.raw(
    `ALTER TABLE "admins" ALTER COLUMN "status" SET DEFAULT '${statusTypes.ACTIVE}';`
  );

exports.down = knex => {};
