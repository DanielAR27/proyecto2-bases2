require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.GRAPH_PORT || 5600;

app.listen(PORT, () => {
  console.log(`Graph Service running on port ${PORT}`);
});