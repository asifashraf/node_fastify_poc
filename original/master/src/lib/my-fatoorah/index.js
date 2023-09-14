module.exports = require(`./${
  process.env.NODE_ENV === 'localtest' ? 'my-fatoorah-mock' : 'my-fatoorah'
}`);
