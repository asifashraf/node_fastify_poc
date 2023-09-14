const middleware = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0].toUpperCase() === 'BEARER'
  ) {
    return next();
  } else {
    return res.status(401).send({
      error: 'Unauthorized',
    });
  }

};

module.exports = middleware;
