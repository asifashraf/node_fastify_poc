const moment = require('moment');

const firebase = require('../lib/firebase');
const { setupAuthContext } = require('../helpers/context-helpers');
const { publishVerifiedEmailToBraze } = require('../lib/braze');

const { transformToCamelCase } = require('../lib/util');

exports.syncRevel = async (req, res) => {
  const { invalidateMenu } = require('../schema/c-menu/utils');
  const context = await setupAuthContext(req);
  let updated = false;
  const job = await context.db
    .table('crons')
    .select()
    .where('type', 'MENU_REVEL')
    .orderByRaw('last_sync ASC NULLS FIRST')
    .first();
  if (!job) {
    res.send('nothing to update');
    return;
  }

  if (
    job.last_sync &&
    moment.duration(moment().diff(moment(job.last_sync))).asMinutes() <= 5
  ) {
    res.send(
      'nothing to update yet' +
        moment.duration(moment(job.last_sync).diff(moment())).asMinutes()
    );
    return;
  }

  const brand = await context.db
    .table('brands')
    .select(
      context.db.raw(
        'brands.pos_id, brands.pos_url, brands.pos_key, brands.pos_secret, menus.id'
      )
    )
    .where('pos_type', 'REVEL')
    .andWhere('menus.id', job.id)
    .join('menus', 'brand_id', 'brands.id')
    .first();
  if (!brand) {
    res.send('nothing to update');
    return;
  }

  const estId = brand.pos_id;
  const menuId = brand.id;
  const posUrl = brand.pos_url;
  const posKey = brand.pos_key;
  const posSecret = brand.pos_secret;
  try {
    const { sync } = require('../lib/sync-utils');
    const Revel = require('../lib/revel');
    const revel = new Revel(posUrl, posKey, posSecret);
    const revelSections = await revel.readAllData(
      '/products/ProductCategory/',
      {
        active: true,
        establishment: estId,
      }
    );
    const sections = await sync(
      context.db,
      revelSections.objects,
      'menu_sections',
      {
        name: 'name',
        nameAr: 'name',
        nameTr: 'name',
        posId: 'resource_uri',
        sortOrder: 'sorting',
      },
      {
        menuId: [
          {
            source: { establishment: `/enterprise/Establishment/${estId}/` },
            destination: menuId,
          },
        ],
      }
    );
    updated = Math.max(...sections.diff) > 0 || updated;
    const revelItems = (await revel.readAllData('/resources/Product/', {
      active: true,
    })).objects;
    const items = await sync(
      context.db,
      revelItems.map(it => {
        return {
          ...it,
          image: it.image
            ? it.image
            : 'https://simg.nicepng.com/png/small/95-944253_iced-coffee-clipart-iced-coffee-graphics.png',
          itemType: it.type === 0 ? 'DRINK' : 'FOOD',
        };
      }),
      'menu_items',
      {
        name: 'name',
        nameAr: 'name',
        nameTr: 'name',
        itemDescription: 'description',
        itemDescriptionAr: 'description',
        itemDescriptionTr: 'description',
        posId: 'resource_uri',
        photo: 'image',
        type: 'itemType',
        sortOrder: 'sorting',
      },
      {
        sectionId: sections.data.map(s => {
          return {
            source: { category: s.pos_id },
            destination: s.id,
          };
        }),
      }
    );
    updated = Math.max(...items.diff) > 0 || updated;
    const ProductModifierClass = await revel.readAllData(
      '/resources/ProductModifierClass/',
      {
        active: true,
      }
    );
    const ModifierClass = await revel.readAllData('/resources/ModifierClass/', {
      active: true,
      establishment: estId,
    });
    const modifiers = (await revel.readAllData('/resources/Modifier/', {
      active: true,
    })).objects;
    let revelModifiers = [];
    for (let i = 0; i < ProductModifierClass.objects.length; i++) {
      ProductModifierClass.objects[i].modC = ModifierClass.objects.find(
        m => m.resource_uri === ProductModifierClass.objects[i].modifierclass
      );
      revelModifiers = revelModifiers.concat(
        modifiers
          .filter(
            m =>
              m.modifierClass === ProductModifierClass.objects[i].modifierclass
          )
          .map(m => {
            return {
              ...m,
              pModClass: ProductModifierClass.objects[i].resource_uri,
              // eslint-disable-next-line camelcase
              resource_uri:
                ProductModifierClass.objects[i].resource_uri +
                '||' +
                m.resource_uri,
            };
          })
      );
    }
    let addedRevelItems = revelItems
      .filter(it => items.data.find(i => i.pos_id === it.resource_uri))
      .map(it => {
        return {
          ...it,
          dbId: items.data.find(i => i.pos_id === it.resource_uri).id,
        };
      });
    const optionSets = await sync(
      context.db,
      ProductModifierClass.objects
        .filter(f => f.modC)
        .map(o => {
          return {
            product: o.product,
            name: o.modC.name,
            sort: o.modC.sort,
            single: false,
            // eslint-disable-next-line camelcase
            resource_uri: o.resource_uri,
          };
        })
        .concat(
          addedRevelItems.map(i => {
            return {
              product: i.resource_uri,
              name: i.name,
              sort: 0,
              single: true,
              // eslint-disable-next-line camelcase
              resource_uri: i.resource_uri,
            };
          })
        ),
      'menu_item_option_sets',
      {
        label: 'name',
        labelAr: 'name',
        labelTr: 'name',
        posId: 'resource_uri',
        single: 'single',
        sortOrder: 'sort',
      },
      {
        menuItemId: items.data
          .map(s => {
            return {
              source: { product: s.pos_id },
              destination: s.id,
            };
          })
          .concat(
            addedRevelItems.map(s => {
              return {
                source: { product: s.resource_uri },
                destination: s.dbId,
              };
            })
          ),
      }
    );
    updated = Math.max(...optionSets.diff) > 0 || updated;
    addedRevelItems = revelItems
      .filter(it => optionSets.data.find(i => i.pos_id === it.resource_uri))
      .map(it => {
        return {
          ...it,
          dbOptionId: optionSets.data.find(i => i.pos_id === it.resource_uri)
            .id,
        };
      });
    const options = await sync(
      context.db,
      revelModifiers
        .map(it => {
          return {
            ...it,
            cost: String(parseFloat(it.price).toFixed(3)),
          };
        })
        .concat(
          addedRevelItems.map(i => {
            return {
              name: i.name,
              cost: String(parseFloat(i.price).toFixed(3)),
              sort: 0,
              pModClass: i.resource_uri,
              // eslint-disable-next-line camelcase
              resource_uri: i.resource_uri,
            };
          })
        ),
      'menu_item_options',
      {
        value: 'name',
        valueAr: 'name',
        valueTr: 'name',
        price: 'cost',
        posId: 'resource_uri',
        sortOrder: 'sort',
      },
      {
        menuItemOptionSetId: optionSets.data
          .map(s => {
            return {
              source: { pModClass: s.pos_id },
              destination: s.id,
            };
          })
          .concat(
            addedRevelItems.map(s => {
              return {
                source: { pModClass: s.resource_uri },
                destination: s.dbOptionId,
              };
            })
          ),
      }
    );
    updated = Math.max(...options.diff) > 0 || updated;
  } catch (err) {
    await context.db
      .table('crons')
      .update({
        // eslint-disable-next-line camelcase
        last_status: 'ERROR',
        // eslint-disable-next-line camelcase
        last_sync: moment.utc().format(),
        // eslint-disable-next-line camelcase
        last_error: err.stack,
      })
      .where('id', job.id);
    res.send(err.message);
    return;
  }

  await context.db
    .table('crons')
    .update({
      // eslint-disable-next-line camelcase
      last_sync: moment.utc().format(),
      // eslint-disable-next-line camelcase
      last_status: 'SUCCESS',
    })
    .where('id', job.id);
  if (updated) await invalidateMenu(menuId);
  res.send('ok - ' + updated);
};

exports.syncCustomer = async (req, res) => {
  try {
    const { email, fromEmail, method } = req.query;
    const user = await firebase.getUserByEmail(email);
    const context = await setupAuthContext(req);
    await context.db
      .table('customers')
      .update({
        email: user.email,
        isEmailVerified: user.emailVerified,
      })
      .whereRaw(
        `(LOWER(email) = '${method === 'recoverEmail' ? fromEmail : email}')`
      );
    // console.log('customer email address braze event:', user);
    if (user.emailVerified) {
      publishVerifiedEmailToBraze(
        {
          customerId: user.uid,
          email: user.email,
        },
        null
      );
    }

    res.send('ok');
  } catch (err) {
    res.send(err.message);
  }
};

exports.syncNegativeBalanceFix = async (req, res) => {
  try {
    const context = await setupAuthContext(req);
    const records = await context.db
      .raw(
        `select tbl.*,
          (SELECT coalesce((sum(lt.credit) - sum(lt.debit)),0) as balance FROM loyalty_transactions lt WHERE lt.customer_id = tbl.customer_id and lt.currency_id = tbl.currency_id) rt
          from (
          select sum(wa.total) total, sum(wa.regular_amount) rm, wa.customer_id, wa.currency_id
          from wallet_accounts wa
          WHERE ( wa.total < 0 or wa.regular_amount < 0)
          group by wa.customer_id, wa.currency_id
          order by wa.customer_id
          ) tbl
          order by rt asc`
      )
      .then(result => transformToCamelCase(result.rows));
    const happened = [];
    if (records.length > 0) {
      const promises = [];
      records.forEach(r => {
        if (Number(r.total) < 0 && Number(r.rm) < 0 && Number(r.rt) < 0) {
          if (
            Number(r.total) === Number(r.rm) &&
            Number(r.rm) === Number(r.rt)
          ) {
            happened.push({
              customerId: r.customerId,
              rm: r.rm,
              currencyId: r.currencyId,
            });
            promises.push(
              context.loyaltyTransaction.credit(
                'NEGATIVE_BALANCE_FIX',
                'NEGATIVE_BALANCE_FIX',
                r.customerId,
                Number(r.rm) * -1,
                r.currencyId
              )
            );
          }
        }
      });
      await Promise.all(promises);
    }

    res.send({ done: true, happened });
  } catch (err) {
    res.send(err.message);
  }
};
