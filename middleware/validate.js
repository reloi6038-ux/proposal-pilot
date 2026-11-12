const { validationResult } = require('express-validator');

/**
 * Runs after a chain of express-validator checks.
 * If any validation failed, respond 400 with details.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    })),
  });
};

module.exports = validate;