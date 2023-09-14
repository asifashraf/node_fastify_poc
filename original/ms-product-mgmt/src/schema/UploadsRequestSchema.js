module.exports = function UploadsRequestSchema(opts) {
    const { baseRequestSchema, multerStorage, commonRequestHeaders } = opts;

    const routeInfo = {
        upload: {
            url: '/upload',
            method: 'POST',
            preHandler: multerStorage.array('files', 10),
            schema : {
                headers: commonRequestHeaders.uploadHeaders()
            }
        }, 
    };

    const schema = baseRequestSchema('uploadRequestHandlers', routeInfo)

    return schema
}
