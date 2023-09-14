const { 
    v1: uuidv1,
    v3: uuidv3,
    v4: uuidv4,
    v5: uuidv5,
    validate,
} = require('uuid');

module.exports = () => {
    return {
        v1: async () => uuidv1(),
        v3: async ({name, namespace}) => uuidv3(name, namespace),
        v4Async: async () => uuidv4(),
        v4: () => uuidv4(),
        v4withOptions: async (options) => uuidv4(options),
        v5: async (string, namesapce) => uuidv5(string, namesapce),
        v4WithoutHyphens: async () => uuidv4().split('-').join(''),
        validate : (value) => validate(value)
    }
}
