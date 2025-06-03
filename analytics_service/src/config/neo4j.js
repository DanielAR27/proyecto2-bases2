const neo4j = require('neo4j-driver');

// Crear driver de conexión
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Función para verificar conexión (nueva forma)
const verifyConnectivity = async () => {
  const session = driver.session();
  try {
    // Ejecutar una query simple para verificar conectividad
    await session.run('RETURN 1 as test');
    console.log(' Neo4J conectado correctamente');
  } catch (error) {
    console.error('Error conectando a Neo4J:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Función para cerrar conexión (cleanup)
const closeDriver = async () => {
  await driver.close();
  console.log('Neo4J driver cerrado');
};

// Función helper para ejecutar queries
const runQuery = async (query, parameters = {}) => {
  const session = driver.session();
  try {
    const result = await session.run(query, parameters);
    return result;
  } finally {
    await session.close();
  }
};

module.exports = {
  driver,
  verifyConnectivity,
  closeDriver,
  runQuery
};