const tableName = 'admin_branch_subscription';

exports.up = knex =>
  knex.schema.table(tableName, table => {
    table.dropForeign('admin_id');
  });

exports.down = knex =>
  knex.schema.table(tableName, table => {
    table
      .foreign('admin_id')
      .references('id')
      .inTable('admins')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
  });
