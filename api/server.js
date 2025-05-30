// server.js

const app = require('./src/app');
require('dotenv').config();

const PORT = process.env.API_PORT;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth service corriendo en http://0.0.0.0:${PORT}`);
});
