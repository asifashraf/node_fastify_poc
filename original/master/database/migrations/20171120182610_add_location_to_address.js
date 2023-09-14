exports.up = knex =>
  knex.schema
    .raw('CREATE EXTENSION IF NOT EXISTS postgis')
    .then(
      () =>
        process.env.NODE_ENV === 'production'
          ? knex.raw(`alter table spatial_ref_sys owner to cofe;`) // AWS RDS sets this table to a different owner
          : Promise.resolve()
    )
    .then(() =>
      knex.schema
        .raw(
          `
INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext)
VALUES ( 7094, 'sr-org', 7094, '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs', 'PROJCS["Google Maps Global Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_2SP"],PARAMETER["standard_parallel_1",0],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",0],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["Meter",1],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs"],AUTHORITY["EPSG","900913"]]')
ON CONFLICT (srid) DO NOTHING;`
        )
        .raw(
          'ALTER TABLE "public"."addresses" ADD COLUMN "geolocation" geometry(Point,4326);'
        )
        .table('addresses', table => {
          table.dropColumn('longitude');
          table.dropColumn('latitude');
        })
    );

exports.down = knex =>
  knex.schema
    .table('addresses', table => {
      table.dropColumn('geolocation');
      table.float('longitude');
      table.float('latitude');
    })
    .raw('DROP EXTENSION IF EXISTS postgis CASCADE');