const Joi = require('joi');

const emailAndPasswordSchema = Joi.object({
  email: Joi.string().email(),
  password: Joi.string().min(6).max(1024).required()
});

module.exports = emailAndPasswordSchema;