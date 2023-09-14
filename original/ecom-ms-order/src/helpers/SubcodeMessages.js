const subcodeMessages = ({
    '1000001': 'Success',
    '7000001': 'Parameter validation failure',
    '7000000': 'Uknown subcode or error',
})

module.exports = function(opts) { return subcodeMessages };