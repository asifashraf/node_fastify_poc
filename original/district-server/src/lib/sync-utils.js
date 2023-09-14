/* eslint-disable max-params */
/* eslint-disable max-nested-callbacks */
/* eslint-disable no-await-in-loop */
const { uuid, transformToSnakeCase } = require('./util');

const sortKeys = ob =>
  Object.keys(ob)
    .sort((a, b) => (a >= b ? (a === b ? 0 : 1) : -1))
    .reduce((a, key) => {
      a[key] = ob[key];
      return a;
    }, {});

const syncUtils = {
  sync: async (db, newData, tableName, syncMap, parents, defaults = {}) => {
    const ds = {};
    parents = transformToSnakeCase(parents);
    ds[Object.keys(parents)[0]] = parents[Object.keys(parents)[0]].map(
      p => p.destination
    );
    const dataSubset = transformToSnakeCase(ds);

    const destinationId = 'pos_id';
    const sourceId = syncMap.posId;
    delete syncMap.posId;
    syncMap = transformToSnakeCase(syncMap);
    defaults = transformToSnakeCase(defaults);
    const newItems = newData
      .filter(ob =>
        parents[Object.keys(parents)[0]].find(
          p =>
            p.source[Object.keys(p.source)[0]] === ob[Object.keys(p.source)[0]]
        )
      )
      .map(ob => {
        const idOb = {};
        idOb[sourceId] = String(ob[sourceId]);
        idOb[Object.keys(parents)[0]] = parents[Object.keys(parents)[0]].find(
          p =>
            p.source[Object.keys(p.source)[0]] === ob[Object.keys(p.source)[0]]
        ).destination;
        return Object.keys(syncMap).reduce((a, v) => {
          a[v] = ob[syncMap[v]];
          return a;
        }, idOb);
      });

    let rsp = null;
    await db.transaction(async trx => {
      try {
        const diff = syncUtils.getDiff(
          (await trx
            .table(tableName)
            .select(
              ...Object.keys(syncMap),
              destinationId,
              Object.keys(parents)[0]
            )
            .whereIn(
              Object.keys(dataSubset)[0],
              dataSubset[Object.keys(dataSubset)[0]]
            )).map(ob => {
            ob = transformToSnakeCase(ob);
            const idOb = {};
            idOb[sourceId] = String(ob[destinationId]);
            idOb[Object.keys(parents)[0]] = ob[Object.keys(parents)[0]];
            return Object.keys(syncMap).reduce((a, v) => {
              a[v] = ob[v];
              return a;
            }, idOb);
          }),
          newItems,
          sourceId
        );
        if (diff.toInsert.length > 0)
          await trx.table(tableName).insert(
            diff.toInsert.map(ob => {
              const idOb = {};
              idOb[destinationId] = ob[sourceId];
              delete ob[sourceId];
              return {
                ...ob,
                id: uuid.get(),
                ...idOb,
                ...defaults,
              };
            })
          );

        if (diff.toUpdate.length > 0) {
          for (let i = 0; i < diff.toUpdate.length; i++) {
            const id = diff.toUpdate[i][sourceId];
            delete diff.toUpdate[i][sourceId];
            await trx
              .table(tableName)
              .update({ ...diff.toUpdate[i] })
              .where(destinationId, id);
          }
        }

        if (diff.toDelete.length > 0)
          await trx
            .table(tableName)
            .whereIn(destinationId, diff.toDelete.map(it => it[sourceId]))
            .delete();

        const resultData = await trx
          .table(tableName)
          .select('id', destinationId)
          .whereIn(
            Object.keys(dataSubset)[0],
            dataSubset[Object.keys(dataSubset)[0]]
          );
        rsp = {
          diff: [
            diff.toInsert.length,
            diff.toUpdate.length,
            diff.toDelete.length,
          ],
          data: transformToSnakeCase(resultData),
        };

        await trx.commit();
      } catch (err) {
        await trx.rollback();
        throw new Error(err);
      }
    });
    return rsp;
  },
  getDiff: (oldData, newData, idField) => {
    if (!oldData || oldData.length === 0)
      return {
        toInsert: newData.slice(),
        toUpdate: [],
        toDelete: [],
      };
    if (!newData || newData.length === 0)
      return {
        toInsert: [],
        toUpdate: [],
        toDelete: oldData.slice(),
      };
    const oldDataLocal = oldData
      .slice()
      .sort((a, b) =>
        (a[idField] >= b[idField] ? (a[idField] === b[idField] ? 0 : 1) : -1)
      );
    const newDataLocal = newData
      .slice()
      .sort((a, b) =>
        (a[idField] >= b[idField] ? (a[idField] === b[idField] ? 0 : 1) : -1)
      );

    const toInsert = [];
    const toUpdate = [];
    const toDelete = [];

    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldDataLocal.length || newIndex < newDataLocal.length) {
      if (oldIndex === oldDataLocal.length) {
        toInsert.push(newDataLocal[newIndex]);
        newIndex++;
      } else if (newIndex === newDataLocal.length) {
        toDelete.push(oldDataLocal[oldIndex]);
        oldIndex++;
      } else if (
        oldDataLocal[oldIndex][idField] === newDataLocal[newIndex][idField]
      ) {
        if (
          JSON.stringify(sortKeys(oldDataLocal[oldIndex])) !==
          JSON.stringify(sortKeys(newDataLocal[newIndex]))
        )
          toUpdate.push(newDataLocal[newIndex]);
        oldIndex++;
        newIndex++;
      } else if (
        oldDataLocal[oldIndex][idField] < newDataLocal[newIndex][idField]
      ) {
        toDelete.push(oldDataLocal[oldIndex]);
        oldIndex++;
      } else {
        toInsert.push(newDataLocal[newIndex]);
        newIndex++;
      }
    }
    return {
      toInsert,
      toUpdate,
      toDelete,
    };
  },
};

module.exports = syncUtils;
