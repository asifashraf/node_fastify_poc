const ON_INSERT_EVENT_FUNCTION = `
CREATE OR REPLACE FUNCTION event_source_trigger() RETURNS trigger AS
$event_source_trigger$
DECLARE
    inputstring text;
BEGIN

CASE NEW.type
	WHEN 'created' THEN
		SELECT string_agg(quote_ident(key),', ') INTO inputstring
		FROM json_object_keys(NEW.payload::json) AS X (key);
		EXECUTE 'INSERT INTO '|| quote_ident(NEW.stream_type)
		|| '(' || inputstring || ') SELECT ' ||  inputstring
		|| ' FROM json_populate_record( NULL::' || quote_ident(NEW.stream_type) || ' , json_in(''' || NEW.payload || '''))';
	WHEN 'deleted' THEN
		EXECUTE 'DELETE FROM '|| quote_ident(NEW.stream_type)
		|| ' WHERE ID = '''|| cast(NEW.payload->>'id' AS text) || '''';
	WHEN 'updated' THEN
		SELECT string_agg(quote_ident(key) || ' = ''' || cast(NEW.payload->>key AS text) || '''', ',') INTO inputstring
		FROM json_object_keys(NEW.payload::json) AS X (key);
		EXECUTE 'UPDATE '|| quote_ident(NEW.stream_type)
		|| ' SET '|| inputstring
		|| ' WHERE ID = '''|| cast(NEW.payload->>'id' AS text) || '''';
ELSE
RAISE EXCEPTION '% envent not found', NEW.type;
END CASE;
    RETURN NEW;
END;
$event_source_trigger$ language 'plpgsql';`;

const DROP_ON_INSERT_EVENT_FUNCTION = `DROP FUNCTION event_source_trigger`;

exports.up = knex => knex.raw(ON_INSERT_EVENT_FUNCTION);
exports.down = knex => knex.raw(DROP_ON_INSERT_EVENT_FUNCTION);

const eventGeneration = `
DO $$DECLARE dyn text;
BEGIN
    select
    string_agg('select ''created'' as type, cast (row_to_json(t) as text) as payload, '
    || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=relname and column_name='id') THEN 'cast(t.id as text)' ELSE '''''' END
    ||' as stream_id, '''|| relname ||''' as stream_type, cast(''1999-01-01 00:00:00.000000+00'' as timestamp) as date from (select * from '|| relname ||') t', ' UNION ')
    into dyn as table from  pg_stat_user_tables where schemaname = 'public' and relname <> 'migrations' and relname <> 'migrations_lock' and relname <> 'spatial_ref_sys';
    execute 'INSERT INTO event_store(type, payload, stream_id, stream_type, date) select b.type, cast( b.payload as jsonb), b.stream_id, b.stream_type, b.date from (' || dyn || ') b';
END$$;`;
