const lang = require('../templates')

module.exports = function Language(opts) {

    const { _ }  = opts

    const { get, isObject, isString, replace } = _

    function translate(type, key, replacement) {

        let text = get(lang[type], key)

        if (replacement && isObject(replacement)) {
            for (const i in replacement) {
                if (isString(replacement[i])) {
                    text = replace(text, new RegExp(i, 'g'), replacement[i])
                }
            }
        }
        return text
    }

    return {
        translate,
    }
}
