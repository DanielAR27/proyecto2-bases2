const app = require('./src/app');
const { initializeIndex } = require('./src/init');

const PORT = process.env.SEARCH_PORT;

app.listen(PORT, () => {
  console.log(`Servicio de búsqueda escuchando en puerto ${PORT}`);
  
  setTimeout(async () => {
    await initializeIndex();
  }, 15000); // Espera a que Elastic y API estén listos
});
