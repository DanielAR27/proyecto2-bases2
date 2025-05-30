
// server.js
const app = require('./src/app');
const PORT = process.env.AUTH_PORT;

//  Solo escucha si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth service corriendo en http://0.0.0.0:${PORT}`);
  });
}
