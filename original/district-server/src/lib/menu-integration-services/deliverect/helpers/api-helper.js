module.exports = function DeliverectApiHelper(config) {

    return ({
        authRequestOptions: () => {
            return {
                grant_type: 'token',
                audience: config.audience,
                client_id: config.clientId,
                client_secret: config.clientSecret,
            }
        }
    })

}