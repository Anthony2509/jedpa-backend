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
  /** URL pública de esta API: base de los enlaces firmados de archivos locales. */
  API_PUBLIC_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:4000'),

  // Almacenamiento de archivos (documentos de participantes).
  STORAGE_DRIVER: Joi.string().valid('local', 'cloudinary').default('local'),
  STORAGE_LOCAL_DIR: Joi.string().default('storage'),
  FILE_URL_TTL_SECONDS: Joi.number().integer().min(30).max(3600).default(300),
  UPLOAD_MAX_BYTES: Joi.number()
    .integer()
    .min(1024)
    .default(5 * 1024 * 1024),
  CLOUDINARY_FOLDER: Joi.string().default('jedpa'),
  CLOUDINARY_CLOUD_NAME: Joi.string().when('STORAGE_DRIVER', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  CLOUDINARY_API_KEY: Joi.string().when('STORAGE_DRIVER', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  CLOUDINARY_API_SECRET: Joi.string().when('STORAGE_DRIVER', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
});

export const envValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
};
