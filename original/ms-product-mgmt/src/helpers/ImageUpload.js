module.exports = function ImageUpload(opts) {

    const { Aws } = opts;

    async function uploadToS3({ path, file, mimeType }) {
        const region = process.env.REGION
        const bucket = process.env.S3_BUCKET_NAME
        const accessKeyId =  process.env.AWS_S3_ACCESS_KEY
        const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY
    
        const s3 = new Aws.S3({
            region,
            signatureVersion: 'v4',
            accessKeyId,
            secretAccessKey,
        })
    
        const Key = path
    
        const params = {
            Key,
            cacheControl: 'max-age=31536000',
            Bucket: bucket,
            Body: file,
            Expires: 30,
            //ACL: 'public-read',
            ContentType: mimeType
        }
    
        const s3Response = await s3.upload(params).promise()
        
        return s3Response
    }

    return {
        uploadToS3,
    }
}