import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().port().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('8h')
    .messages({
      'string.pattern.base':
        'JWT_EXPIRES_IN debe tener el formato 8h, 30m, 1d...',
    }),

  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
});

export const envValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
};
