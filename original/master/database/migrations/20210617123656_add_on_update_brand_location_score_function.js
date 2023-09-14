const ON_UPDATE_BRAND_LOCATION_SCORE_FUNCTION = `
CREATE OR REPLACE FUNCTION on_update_brand_location_score_update()
  RETURNS trigger AS
$$
BEGIN
	INSERT INTO brand_location_score (id,brand_location_id, total_score, total_reviews)
	VALUES ( uuid_generate_v4 (),NEW.brand_location_id, NEW.rating, 1)
	ON CONFLICT (brand_location_id) DO UPDATE SET total_score = brand_location_score.total_score + excluded.total_score, 
    total_reviews = brand_location_score.total_reviews + 1, updated = now();
    RETURN NEW;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER brand_location_score_trigger
  AFTER INSERT
  ON order_rating
  FOR EACH ROW
  EXECUTE PROCEDURE on_update_brand_location_score_update();
`;

const DROP_ON_UPDATE_BRAND_LOCATION_SCORE_FUNCTION = `
DROP TRIGGER brand_location_score_trigger ON order_rating;

DROP FUNCTION on_update_brand_location_score_update;
`;

exports.up = knex => knex.raw(ON_UPDATE_BRAND_LOCATION_SCORE_FUNCTION);
exports.down = knex => knex.raw(DROP_ON_UPDATE_BRAND_LOCATION_SCORE_FUNCTION);
