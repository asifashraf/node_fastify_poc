module.exports = function ManufacturersRequestHandlers(opts) {

    const { crudBaseHandler } = opts;

    const handler = crudBaseHandler([
        'svcManufacturers',
    ], 'manufacturers');

    const {
        svcManufacturers
    } = handler.di;

    handler.fetch = async function (req, reply) {

        const { body, pagination, i8ln } = req;

        const { filters } = body;

        const manufacturers = await svcManufacturers.getAllManufacturers({ filters, pagination, i8ln });

        reply.send( manufacturers );
    }

    handler.save = async function (req, reply) {

        const { body } = req;

        const { manufacturer } = body;

        const manufacturers = await svcManufacturers.createManufacturer({ manufacturer });

        reply.send( manufacturers );
    }

    handler.delete = async function (req, reply) {

        const { body } = req;

        const { id } = body;

        const manufacturer = await svcManufacturers.deleteManufacturer({ id });

        reply.send( manufacturer );
    }

    handler.update = async function (req, reply) {

        const { body } = req;

        const { manufacturer } = body;

        const manufacturers = await svcManufacturers.updateManufacturer({ manufacturer });

        reply.send( manufacturers );
    }

    handler.getManufacturerDetail = async function (req, reply) {

        const { params } = req;

        const manufacturer = await svcManufacturers.getManufacturerDetail({ params });

        reply.send( manufacturer );
    }

    return handler;
}
