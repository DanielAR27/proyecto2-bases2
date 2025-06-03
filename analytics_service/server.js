require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.ANALYTICS_PORT || 5600;

app.listen(PORT, () => {
  console.log(`Analytics Service running on port ${PORT}`);
});