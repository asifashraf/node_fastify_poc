/* eslint-disable camelcase */

const knex = require('../../database');
const { map, groupBy, chunk } = require('lodash');
const { uuid, transformToCamelCase } = require('../lib/util');
const CHUNK_SIZE = 100;
console.log('Running: update-status-menu-section.js');
console.time('Update_Section_Status_Script_Timer_Startred');
knex
  .transaction(async trx => {
    /**
     * updated sections that are not items or all items are inactive
     */
    const query = `UPDATE menu_sections SET status = 'INACTIVE' WHERE id in (
        SELECT section_id from (
          SELECT ms.id as section_id, mi.status from menu_sections as ms 
          LEFT JOIN menu_items as mi ON mi.section_id = ms.id
        ) as temp 
        GROUP BY section_id HAVING Sum(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END )=0
      );`
     
    await trx.raw(query);

    /*
    const query = `
    select * from menu_sections
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
    console.log('Checking data');
    if (data && Array.isArray(data) && data.length > 0) {
      console.time('time_to_fetch_menu_items');
      let updateArrayList = [];
      let menuItems = await new Promise((resolve, reject) => {
        trx
          .raw(`SELECT * FROM MENU_ITEMS`)
          .then(({ rows }) => resolve(rows))
          .catch(err => reject(err));
      }).then(transformToCamelCase);
      console.timeEnd('time_to_fetch_menu_items');
      console.time('for_loop_time');
      let activeSectionIds = [];
      let inActiveSectionIds = [];
      for (const section of data) {
        let filteredMenuItems = menuItems.filter(item => item.sectionId == section.id);
        const isAllMenuItemsInactive = (currentValue) => currentValue.status === 'INACTIVE';
        let AllMenuItemsInactive = filteredMenuItems.every(isAllMenuItemsInactive);
        (AllMenuItemsInactive == true) ? inActiveSectionIds.push(section.id) : activeSectionIds.push(section.id);
      }
      console.timeEnd('for_loop_time')
      console.time('transaction_time')
      if (inActiveSectionIds.length > CHUNK_SIZE) {
        let chunks = chunk(inActiveSectionIds, CHUNK_SIZE);
        for await (const idChunk of chunks) {
          await trx('menu_sections').whereIn('id', idChunk).update({ status: 'INACTIVE' });
        }
      } else {
        await trx('menu_sections').whereIn('id', inActiveSectionIds).update({ status: 'INACTIVE' });
      }
      console.timeEnd('transaction_time');


    } else {
      console.log('Data not found');
    }
    */
  })
  .then(() => {
    console.log('All done!');
    console.timeEnd('Update_Section_Status_Script_Timer_Startred');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
