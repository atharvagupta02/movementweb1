import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

import app from "./app.js";
import connectDb from "./config/mongodb.js";

/**
 * Entry point for local development and for any normal Node host.
 * On Vercel the function in api/index.js is used instead.
 */
const port = process.env.PORT || 8080;

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log("server started on PORT:" + port);
    });
  })
  .catch((error) => {
    // Fail loudly rather than listening without a database.
    console.error("Failed to connect to MongoDB - server not started.");
    console.error(error.message);
    process.exit(1);
  });
