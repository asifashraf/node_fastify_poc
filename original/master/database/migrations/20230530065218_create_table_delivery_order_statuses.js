
exports.up = function (knex) {
    return knex.raw(`
        CREATE TABLE IF NOT EXISTS delivery_order_statuses
        (
            id uuid NOT NULL,
            created_at timestamp without time zone NOT NULL,
            updated_at timestamp without time zone NOT NULL,
            delivery_partner character varying(255) COLLATE pg_catalog."default" NOT NULL,
            event_created_at timestamp without time zone,
            order_url character varying(255) COLLATE pg_catalog."default",
            partner_order_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            reference character varying(255) COLLATE pg_catalog."default",
            rider_contact_no character varying(255) COLLATE pg_catalog."default",
            rider_geolocation geometry(Point,4326),
            rider_id character varying(255) COLLATE pg_catalog."default",
            rider_name character varying(255) COLLATE pg_catalog."default",
            status character varying(255) COLLATE pg_catalog."default" NOT NULL,
            track_url character varying(255) COLLATE pg_catalog."default",
            type character varying(255) COLLATE pg_catalog."default",
            CONSTRAINT delivery_order_statuses_pkey PRIMARY KEY (id)
        );

        CREATE INDEX IF NOT EXISTS idx_delivery_order_statuses_created_at
            ON delivery_order_statuses USING btree
            (created_at ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_order_statuses_partner_order_id
            ON delivery_order_statuses USING btree
            (partner_order_id COLLATE pg_catalog."default" ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_order_statuses_reference
            ON delivery_order_statuses USING btree
            (reference COLLATE pg_catalog."default" ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_order_statuses_status
            ON delivery_order_statuses USING btree
            (status COLLATE pg_catalog."default" ASC NULLS LAST);`);
};

exports.down = function (knex) {
    return knex.raw(`
        DROP INDEX IF EXISTS idx_delivery_order_statuses_partner_order_id;
        DROP INDEX IF EXISTS idx_delivery_order_statuses_partner_order_id;
        DROP INDEX IF EXISTS idx_delivery_order_statuses_reference;
        DROP INDEX IF EXISTS idx_delivery_order_statuses_status;
        DROP TABLE IF EXISTS delivery_order_statuses;
  `)
};
