import serverless from 'serverless-http'
import app from './src/app.js'
import { readFileSync } from "fs";
import { join } from "path";

app.get("/.well-known/assetlinks.json", (req, res) => {
  const filePath = join(process.cwd(), "public", ".well-known", "assetlinks.json");
  try {
    const data = readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (err) {
    res.status(404).send({ error: "assetlinks.json not found" });
  }
});


export const handler = serverless(app)

// Kalau dijalankan langsung di lokal → start server biasa -
// if (process.env.NODE_ENV !== "production") {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`Local server running at http://localhost:${PORT}`);
//   });
// }