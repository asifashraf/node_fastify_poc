const knex = require('../knex');
const config = require('../../globals/config');
const logger = require('pino')();

describe('Test KNEX Adapter For PostgreSQL', () => {
    test('Should return KNEX object & check connection status to PostgreSQL', async () => {
        const _knex = await knex({ logger, config });

        expect(_knex).toBeDefined();

        const result = await _knex.raw('SELECT version();');

        expect(result).toBeDefined();

        expect(result.rows).toBeDefined();

        const { rows } = result;

        const [version] = rows;

        expect(version).toBeDefined();

        expect(version.version).toBeDefined();

        expect(version.version).toContain('PostgreSQL');

        await _knex.destroy();
    })
})