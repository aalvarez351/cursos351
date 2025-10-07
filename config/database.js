const mongoose = require('mongoose');

// Cadena de conexión encriptada en Base64
const ENCRYPTED_URI = 'bW9uZ29kYitzcnY6Ly9hYWx2YXJlejM1MTpMZW50ZXNkZXNvbEBpYW51YmUuZnVycXNsMC5tb25nb2RiLm5ldC8/cmV0cnlXcml0ZXM9dHJ1ZSZ3PW1ham9yaXR5JmFwcE5hbWU9aWFudWJl';

// Función para decodificar Base64
const getConnectionString = () => {
  return Buffer.from(ENCRYPTED_URI, 'base64').toString('utf-8');
};

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const uri = getConnectionString();
    await mongoose.connect(uri);
    console.log('MongoDB conectado exitosamente');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };