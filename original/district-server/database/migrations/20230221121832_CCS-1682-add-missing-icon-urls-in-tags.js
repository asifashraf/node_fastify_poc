exports.up = function(knex) {
  return knex.schema.raw(`
    UPDATE TAGS
    SET icon_url  = 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/offers/offer_icon_1.png'
    WHERE icon_url = '' OR icon_url IS NULL;


    UPDATE TAGS
    SET icon_url_ar  = 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/offers/offer_icon_1.png'
    WHERE icon_url_ar = '' OR icon_url_ar IS NULL;


    UPDATE TAGS
    SET icon_url_tr  = 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/offers/offer_icon_1.png'
    WHERE icon_url_tr = '' OR icon_url_tr IS NULL;

      `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
  UPDATE TAGS
  SET icon_url  = ''
  WHERE icon_url = 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/offers/offer_icon_1.png' 

  UPDATE TAGS
  SET icon_url_ar  = ''
  WHERE icon_url_ar = 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/offers/offer_icon_1.png'

  UPDATE TAGS
  SET icon_url_tr  = ''
  WHERE icon_url_tr = 'https://s3.eu-west-1.amazonaws.com/content.cofeadmin.com/media/shared/offers/offer_icon_1.png' 
      `);
};
