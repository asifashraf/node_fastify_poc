
exports.up = function (knex) {
    return knex.raw(`
        CREATE TABLE IF NOT EXISTS delivery_orders
        (
            id uuid NOT NULL,
            created_at timestamp without time zone NOT NULL,
            updated_at timestamp without time zone NOT NULL,
            amount_due double precision,
            cod boolean,
            customer_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            customer_name character varying(255) COLLATE pg_catalog."default",
            customer_number character varying(255) COLLATE pg_catalog."default",
            delivery_partner character varying(255) COLLATE pg_catalog."default" NOT NULL,
            distance character varying(255) COLLATE pg_catalog."default",
            dropoff_address_line1 character varying(255) COLLATE pg_catalog."default",
            dropoff_geolocation geometry(Point,4326),
            estimated_time character varying(255) COLLATE pg_catalog."default",
            message character varying(255) COLLATE pg_catalog."default",
            order_id uuid NOT NULL,
            paid boolean,
            partner_order_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
            pickup_address_line1 character varying(255) COLLATE pg_catalog."default",
            pickup_geolocation geometry(Point,4326),
            prep_time integer,
            reference character varying(255) COLLATE pg_catalog."default",
            status character varying(255) COLLATE pg_catalog."default" NOT NULL,
            total double precision,
            country_dial_code character varying(255) COLLATE pg_catalog."default",
            partner_reference_id character varying COLLATE pg_catalog."default",
            CONSTRAINT delivery_orders_pkey PRIMARY KEY (id)
        );

        CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_id
            ON delivery_orders USING btree
            (customer_id COLLATE pg_catalog."default" ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_orders_order_id
            ON delivery_orders USING btree
            (order_id ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_orders_paid
            ON delivery_orders USING btree
            (paid ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_orders_partner_order_id
            ON delivery_orders USING btree
            (partner_order_id COLLATE pg_catalog."default" ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_orders_partner_reference_id
            ON delivery_orders USING btree
            (partner_reference_id COLLATE pg_catalog."default" ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_delivery_orders_status
            ON delivery_orders USING btree
            (status COLLATE pg_catalog."default" ASC NULLS LAST);
    `)
};

exports.down = function (knex) {
    return knex.raw(`
        DROP INDEX IF EXISTS idx_delivery_orders_customer_id;
        DROP INDEX IF EXISTS idx_delivery_orders_order_id;
        DROP INDEX IF EXISTS idx_delivery_orders_paid;
        DROP INDEX IF EXISTS idx_delivery_orders_partner_order_id;
        DROP INDEX IF EXISTS idx_delivery_orders_partner_reference_id;
        DROP INDEX IF EXISTS idx_delivery_orders_status;
        DROP TABLE IF EXISTS delivery_orders;
    `);
};
