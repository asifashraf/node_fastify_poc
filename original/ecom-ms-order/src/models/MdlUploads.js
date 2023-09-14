module.exports = function MdlUploads(opts) {

    const { httpRequest, Boom, fs, formData, config, constants, } = opts;

    const { productModuleUrl } = config

    const { API_URLS } = constants;

    const model = {}
 
    model.upload = async function upload(fileName, folder) {

        const form = new formData();

        form.append('files', fs.createReadStream(fileName));

        const uploadResponse = await httpRequest.send({
            path: `${productModuleUrl}${API_URLS.UPLOAD}`,
            method: 'POST',
            params: form,
            headers: { ...form.getHeaders(), folder },
            json: true
        });

        let result = uploadResponse?.data

        if (!result?.length)
            throw Boom.notFound('File Not Uploaded.');

        await fs.unlinkSync(fileName)

        return result[0].image;
    }

    return model
}


