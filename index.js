import serverless from 'serverless-http'
import app from './src/app.js'

export const handler = serverless(app)

// Kalau dijalankan langsung di lokal → start server biasa -
// if (process.env.NODE_ENV !== "production") {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`Local server running at http://localhost:${PORT}`);
//   });
// }