const tableName = 'admin_branch_subscription';

exports.up = knex =>
  knex.schema.table(tableName, table => {
    table.string('admin_id').alter();
  });

exports.down = knex =>
  knex.schema.table(tableName, table => {
    table.uuid('admin_id').alter();
  });
