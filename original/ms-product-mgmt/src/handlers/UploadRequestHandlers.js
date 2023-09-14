module.exports = function SuppliersRequestHandlers(opts) {

    const { svcUploads } = opts

    const handler = {}

    handler.upload = async function (req, reply) {

        const { files, headers } = req;

        const { folder } =  headers

        const images = await svcUploads.upload({ files, folder });

        reply.send( {data : images });

    }

    return handler;
}
