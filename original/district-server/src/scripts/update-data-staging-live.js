/* eslint-disable camelcase */
const { filter, includes } = require('lodash');
const knex = require('../../database');
if (process.env.STAGING_DATABASE_URL) {
  const knexStaging = require('knex')({
    client: 'pg',
    debug: false,
    connection: process.env.STAGING_DATABASE_URL,
  });

  knex
    .transaction(async trx => {
      const brands = await knexStaging('brands');
      await Promise.all(
        brands.map(brand =>
          trx('brands')
            .where({ id: brand.id })
            .update({
              name: brand.name,
              name_ar: brand.name_ar,
              name_tr: brand.name_tr,
              hero_photo: brand.hero_photo,
              carousel_image: brand.carousel_image,
              favicon: brand.favicon,
            })
        )
      );
      console.log('brands updated!');

      const brandLocations = await knexStaging('brand_locations');
      await Promise.all(
        brandLocations.map(brandLocation =>
          trx('brand_locations')
            .where({ id: brandLocation.id })
            .update({
              brand_id: brandLocation.brand_id,
              name: brandLocation.name,
              name_ar: brandLocation.name_ar,
              name_tr: brandLocation.name_tr,
            })
        )
      );
      console.log('brand_locations updated!');

      const menuSections = await knexStaging('menu_sections');
      await Promise.all(
        menuSections.map(menuSection =>
          trx('menu_sections')
            .where({ id: menuSection.id })
            .update({
              name: menuSection.name,
              name_ar: menuSection.name_ar,
              name_tr: menuSection.name_tr,
            })
        )
      );
      console.log('menu_sections updated!');

      const menuItems = await knexStaging('menu_items');
      await Promise.all(
        menuItems.map(menuItem =>
          trx('menu_items')
            .where({ id: menuItem.id })
            .update({
              name: menuItem.name,
              name_ar: menuItem.name_ar,
              name_tr: menuItem.name_tr,
            })
        )
      );
      console.log('menu_items updated!');

      const menuItemOptionSets = await knexStaging('menu_item_option_sets');
      await Promise.all(
        menuItemOptionSets.map(menuItemOptionSet =>
          trx('menu_item_option_sets')
            .where({ id: menuItemOptionSet.id })
            .update({
              label: menuItemOptionSet.label,
              label_ar: menuItemOptionSet.label_ar,
            })
        )
      );
      console.log('menu_item_option_sets updated!');

      const menuItemOptions = await knexStaging('menu_item_options');
      await Promise.all(
        menuItemOptions.map(menuItemOption =>
          trx('menu_item_options')
            .where({ id: menuItemOption.id })
            .update({
              value: menuItemOption.value,
              value_ar: menuItemOption.value_ar,
            })
        )
      );
      console.log('menu_item_options updated!');
      const priceRules = await knexStaging('brand_location_price_rules');
      await trx('brand_location_price_rules').insert(priceRules);
      console.log('brand_location_price_rules inserted!');
      // await Promise.all(
      //   priceRules.map(priceRule =>
      //     trx('brand_location_price_rules').insert(priceRule)
      //   )
      // );
      const banners = await knexStaging('banners');
      await trx('banners').insert(banners);
      console.log('banners inserted!');

      const _brandLocations = await knex('brand_locations');
      const _menuItemIds = (await knex('menu_items')).map(mi => mi.id);
      await Promise.all(
        _brandLocations.map(async bl => {
          const unavailableItems = filter(
            await knexStaging('brand_locations_unavailable_menu_items').where(
              'brand_location_id',
              bl.id
            ),
            i => includes(_menuItemIds, i.menuItemId)
          );

          if (unavailableItems.length > 0) {
            await trx
              .raw(
                `DELETE FROM brand_locations_unavailable_menu_items WHERE brand_location_id='${bl.id}'`
              )
              .then(
                () =>
                  trx('brand_locations_unavailable_menu_items').insert(
                    unavailableItems
                  )
                // Promise.all(
                //   unavailableItems.map(unavailableItem =>
                //     trx('brand_locations_unavailable_menu_items').insert(
                //       unavailableItem
                //     )
                //   )
                // )
              );
          }
        })
      );
      console.log('brand_locations_unavailable_menu_items updated!');

      // const unavailableItems = await knexStaging(
      //   'brand_locations_unavailable_menu_items'
      // );
      // await trx
      //   .raw('TRUNCATE TABLE brand_locations_unavailable_menu_items')
      //   .then(() =>
      //     Promise.all(
      //       unavailableItems.map(unavailableItem =>
      //         trx('brand_locations_unavailable_menu_items').insert(
      //           unavailableItem
      //         )
      //       )
      //     )
      //   );
    })
    .then(async () => {
      console.log('all done!');
      await knexStaging.destroy();
      return knex.destroy();
    })
    .catch(async err => {
      console.log('error', err);
      await knexStaging.destroy();
      return knex.destroy().then(knexStaging.destroy);
    });
} else {
  console.log('no staging connection string');
}
