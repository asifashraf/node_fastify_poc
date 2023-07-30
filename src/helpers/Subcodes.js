const subcodes = ({
    API_RESULT_SUCCESS: '1000001',
    DEFAULT_ERROR_SUBCODE: '7000000',
    JOI_VALIDATION_FAILURE: '7000001',
    INTERNAL_SERVER_ERROR: '5000005'
})

module.exports = function(opts) { return subcodes };