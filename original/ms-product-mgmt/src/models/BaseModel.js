module.exports = function BaseModel(opts) {

    const { moment } = opts;

    return (table) => {
        const { primary } = opts.db;

        const _table = table;

        const link = primary;

        return ({
            get table() { return _table },
            get link() { return link },
            now: function (format = 'YYYY-MM-DD HH:mm:ss Z') {
                let _now = moment();

                _now = _now.format(format);

                return _now;
            },
            getAll: async function () {
                return await link(_table)
                    .select('*');
            },
            where: async function (select, where) {
                return await link(_table)
                    .select(select)
                    .where(where);
            },
            update: async function (columns, where, returning = '*') {
                return await link(_table)
                    .where(where)
                    .update(columns)
                    .returning(returning)
            },
            insert: async function(data, returning = '*') {
                return await link(_table)
                .insert(data, returning)
            },
            upsert: async function (data, keys, columns) {
                if (keys.length === 1) [keys] = keys;

                return await link(_table)
                    .insert(data)
                    .onConflict(keys)
                    .merge(columns)
                    .returning('*')
            },
            softDelete: async function (where, columns, returning = 'id') {

                columns['deleted_at'] = this.now();

                const _delete = await link(_table).update(columns)
                    .where(where)
                    .returning(returning);

                return _delete;
            },
            doesExist: async function (builder) {
                return await link(_table)
                    .where(builder)
                    .first('id')
            }
        });
    }
}
