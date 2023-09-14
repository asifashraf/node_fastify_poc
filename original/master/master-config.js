require('dotenv').config({ silent: true });

let masterDb = require('knex');

let env = Object.assign(
    { NODE_ENV: 'development' },
    process.env
);

const valueTransformer = (value, type) => {
    const types = {
        '1': (value) => value,
        '2': (value) => value === 'true',
        '3': (value) => Number(value)
    }

    return types[type](value);
}

masterDb = masterDb({
    client: 'pg',
    connection: env.MASTER_DATABASE_URL,
    pool: {
        min: 1,
        max: 8,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 60000,
        reapIntervalMillis: 10000,
    },
})

module.exports = {
    initialize: async function () {
        try {
            const startup = await masterDb.raw(`SELECT 1 AS READY;`);
            console.info('Master Dataase KNEX is [ready]', startup.rows);

            const configs = await masterDb.raw(`SELECT DC.key_name,DC.key_value,DC.key_type FROM cloud_domains AS CD 
                JOIN config_versions AS CV ON CV.domain_id = CD.id
                JOIN domain_configs AS DC ON DC.key_domain = CD.id
                WHERE CD.fqdn = ? AND CD.active = true`, [
                env.CHILD_DOMAIN_NAME
            ]);

            console.info(`Loaded ${configs.rows.length} configuration values from master database`);

            if (configs.rows.length === 0) {
                console.error(`No configuration loaded from master database, process will terminate`);
                console.info(`Terminating....`);
                process.exit(1);
            }

            configs.rows.forEach(row => {
                env[row.key_name] = valueTransformer(row.key_value, row.key_type);
            })
        } catch (ex) {
            console.error(`MasterConfig > Exception >`, ex);
            console.info(`Exception while loading master config, terminating process...`);
            process.exit(1);
        }
    },
    env
}
