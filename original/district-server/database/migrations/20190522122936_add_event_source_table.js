const ADD_EVENT_SOURCE_TABLE = `
CREATE TABLE event_store (
  id bigserial primary key,
  type varchar(256) NOT NULL,
  payload jsonb,
  stream_id varchar(256),
  stream_type varchar(256),
  date timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TRIGGER event_source_trigger BEFORE INSERT ON event_store
    FOR EACH ROW EXECUTE PROCEDURE event_source_trigger();
 `;

const DROP_ADD_EVENT_SOURCE_TABLE = `DROP TRIGGER event_source_trigger ON event_store; DROP TABLE event_store`;

exports.up = knex => knex.raw(ADD_EVENT_SOURCE_TABLE);
exports.down = knex => knex.raw(DROP_ADD_EVENT_SOURCE_TABLE);
