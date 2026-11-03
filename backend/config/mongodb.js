import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// On Windows or certain networks, Node's default DNS resolver fails to query SRV
// records for MongoDB Atlas (querySrv ECONNREFUSED). Using public DNS resolves it.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore if running in an environment where setServers is unsupported
}

// One in-flight/finished connection per process. On a server it runs once; in a
// serverless function it makes every request after the first reuse the open
// connection instead of opening a new one.
let connecting = null;

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (connecting) return connecting;

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set. Add it to backend/.env or the host's environment settings");
  }

  // The URI carries the database username and password, so only the host is
  // logged - never the full connection string.
  const host = (() => {
    try {
      return new URL(process.env.MONGO_URI).host;
    } catch {
      return "(unparseable MONGO_URI)";
    }
  })();

  console.log(`Connecting to MongoDB at ${host}`);

  // Deliberately not swallowed: callers must not serve requests with no
  // database - that looks healthy and fails on every read.
  connecting = mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      connecting = null; // let the next request try again
      throw error;
    });

  return connecting;
};

export default connectDb;
