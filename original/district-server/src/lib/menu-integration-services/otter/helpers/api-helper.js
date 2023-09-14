module.exports = function OtterApiHelper(config) {

    return ({
        authRequestOptions: () => {
            return {
                grant_type: 'token',
                scope: config.scope,
                client_id: config.clientId,
                client_secret: config.clientSecret,
            }
        }
    })

}