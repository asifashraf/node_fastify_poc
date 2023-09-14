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
		SELECT string_agg(quote_ident(KEY) || ' = ' || (CASE  COALESCE(NEW.payload->>key, '{||NULL||}') WHEN '{||NULL||}' THEN  'NULL' ELSE '''' || cast(NEW.payload->>key AS text) || '''' END), ',') INTO inputstring
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
