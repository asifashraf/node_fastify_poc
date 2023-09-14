/* eslint-disable camelcase */

const knex = require('../../database');
const { map, chunk } = require('lodash');
const { uuid, transformToCamelCase } = require('../lib/util');
const CHUNK_SIZE = 100;
console.log('Running: update-status-menu-item.js');
console.time('Update_Menu_Status_Script_Timer_Startred');

knex
  .transaction(async trx => {
    const query = `
    select blmi.menu_item_id,bl.brand_id,COUNT(brand_location_id) from brand_locations_unavailable_menu_items blmi left join brand_locations bl on bl.id=blmi.brand_location_id
 where blmi.state='NOT_COMMERCIALIZED' and bl.status = 'ACTIVE'
  group by blmi.menu_item_id,bl.brand_id; 
    `;

    const data = map(
      await new Promise((resolve, reject) => {
        trx
          .raw(query)
          .then(({ rows }) => resolve(rows))
          .catch(err => reject(err));
      }).then(transformToCamelCase),
      n => n
    );
    if (data && Array.isArray(data) && data.length > 0) {
      let queryToFetchCount = `SELECT count(id), brand_id from brand_locations where status = 'ACTIVE' and brand_id in (${data.map(x => `'${x.brandId}'`)}) GROUP BY brand_id`
      let brandLocationCount = await new Promise((resolve, reject) => {
        trx
          .raw(queryToFetchCount)
          .then(({ rows }) => resolve(rows))
          .catch(err => reject(err));
      }).then(transformToCamelCase);
      let inActiveMenuItemIds = [];
      for await (const branchMenuItem of data) {
        let brandLocationInfo = brandLocationCount.find(x => x.brandId == branchMenuItem.brandId);
        if (brandLocationInfo) {
          if (Number(brandLocationInfo.count) === Number(branchMenuItem.count)) {
            inActiveMenuItemIds.push(branchMenuItem.menuItemId);
          }
        }
      }
      console.log('TOTAL MENU ITEMS TO BE SET AS INACTIVE ARE:', inActiveMenuItemIds.length);
      if (inActiveMenuItemIds.length > CHUNK_SIZE) {
        let chunks = chunk(inActiveMenuItemIds, CHUNK_SIZE);
        for await (const idChunk of chunks) {
          await trx('menu_items').whereIn('id', idChunk).update({ status: 'INACTIVE' });
        }
      } else {
        await trx('menu_items').whereIn('id', inActiveMenuItemIds).update({ status: 'INACTIVE' });
      }


    } else {
      console.log('Data not found');
    }
  })
  .then(() => {
    console.timeEnd('Update_Menu_Status_Script_Timer_Startred');
    console.log('All done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
