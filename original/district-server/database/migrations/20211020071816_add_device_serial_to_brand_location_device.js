
const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = async knex => {
    await knex.schema.alterTable('brand_location_devices', table => {
        table.renameColumn('created_at', 'created')
        table.renameColumn('updated_at', 'updated')
        table.string('device_serial_id').nullable()
        table.timestamp('off_until').nullable();
    }).then(() => knex.raw(onUpdateTrigger('brand_location_devices')));;
  };
  
  exports.down = async knex => {
    await knex.schema.alterTable('brand_location_devices', table => {
        table.dropColumn('device_serial_id');
        table.dropColumn('off_until');
    });
  };
