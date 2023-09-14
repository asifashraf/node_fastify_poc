module.exports = function SvcUploads(opts) {

    const { Boom, logger, imageUpload, guid, i18n } = opts;

    const { uploadToS3 } = imageUpload

    const fileExtenstions = {
        'image/png' : '.png',
        'image/jpeg' : '.jpeg',
        'image/jpg' : '.jpeg',
        'application/pdf' : '.pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'text/plain': '.txt',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/msword': '.doc',
        'video/quicktime': '.mov',
        'video/x-matroska': '.mkv',
        'video/mp4': '.mp4',
        'text/csv': '.csv',
    }

    const upload = async ({ files, folder }) => {
        try {
            const basePath =  process.env.AWS_S3_BASE_PATH
            const path =  `${basePath}/${folder}/`

            const responseData = []

            if (files?.length){
                for (let index = 0; index < files.length; index++) {
                    const file = files[index]

                    const fileExtenstion = fileExtenstions[file.mimetype]
                    let fileName = `${guid.v4()}${fileExtenstion}`

                    if (folder === 'taxInvoices')
                        fileName = file.originalname;

                    if (!fileExtenstion){
                        continue
                    }

                    await uploadToS3({ path: path + fileName , file: file.buffer, mimeType: file.mimetype })

                    responseData.push({
                        image: fileName,
                    })
                }
            }

            return responseData

        } catch (ex) {
            logger.error({ msg: 'SvcUploadsjs > upload > error >', ex });
            throw new Boom.Boom(i18n.__(ex.message));
        }
    }

    return {
        upload
    }
}
