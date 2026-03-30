const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

const isCloudinaryConfigured = () =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      reject(
        new Error(
          'Cloudinary não configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.'
        )
      );
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'kudiamap/menu-items',
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    uploadStream.end(buffer);
  });

module.exports = {
  uploadBufferToCloudinary,
  isCloudinaryConfigured,
};