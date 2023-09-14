const knex = require('../../database');
console.log('Running: migrate-brand-list-for-gift-card-templates');

knex.transaction(async trx => {
   const giftCardTemplates = await trx('gift_card_templates')
    .select('id', 'brand_id')
    .whereNotNull('brand_id');
   console.log('Gift Card Templates Row Numbers:', giftCardTemplates.length); 
   const insertedValue = giftCardTemplates.map( row => {
       return {gift_card_template_id: row.id, brand_id:row.brandId}
   }) 
   console.log('Inserted Row Numbers:', insertedValue);
   await trx('gift_card_templates_brands').insert(insertedValue);
}).then(() => {
    console.log('All done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });