// import dns from "node:dns";
// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";
// import helmet from "helmet";
// import { config } from "./config.js";
// import { rateLimit } from "./middleware/rateLimit.js";
// import authRoutes from "./routes/auth.js";
// import patientsRoutes from "./routes/patients.js";
// import sessionsRoutes from "./routes/sessions.js";
// import usersRoutes from "./routes/users.js";
// import resultsRoutes from "./routes/results.js";
// import plansRoutes from "./routes/plans.js";
// import checkinsRoutes from "./routes/checkins.js";
// import adminRoutes from "./routes/admin.js";

// if (config.dnsServers.length) dns.setServers(config.dnsServers);

// export const app = express();
// app.set("trust proxy", 1); // correct client IP behind Render / Railway / Nginx
// app.disable("x-powered-by");
// app.use(helmet());
// app.use(
//   cors({
//     origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
//   })
// );
// app.use(express.json({ limit: "100kb" }));
// app.use("/api", rateLimit({ windowMs: 60_000, max: 300 }));

// app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
// app.use("/api/auth", authRoutes);
// app.use("/api/patients", patientsRoutes);
// app.use("/api/sessions", sessionsRoutes);
// app.use("/api/results", resultsRoutes);
// app.use("/api/plans", plansRoutes);
// app.use("/api/checkins", checkinsRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/users", usersRoutes);

// app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

// // Last-resort error handler (Express 5 forwards async errors here).
// // eslint-disable-next-line no-unused-vars
// app.use((err, _req, res, _next) => {
//   if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON" });
//   if (err.type === "entity.too.large") return res.status(413).json({ message: "Request too large" });
//   console.error("UNHANDLED:", err);
//   res.status(500).json({ message: config.isProd ? "Something went wrong" : err.message });
// });

// if (process.env.NODE_ENV !== "test") {
//   mongoose
//     .connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 })
//     .then(async () => {
//       console.log("MongoDB connected");
//       await mongoose.model("User").syncIndexes(); // creates the 7-day cleanup index
//       app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
//     })
//     .catch((err) => {
//       console.error("DB connection failed:", err.message);
//       process.exit(1);
//     });
// }
import dns from "node:dns";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { rateLimit } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.js";
import patientsRoutes from "./routes/patients.js";
import sessionsRoutes from "./routes/sessions.js";
import usersRoutes from "./routes/users.js";
import resultsRoutes from "./routes/results.js";
import plansRoutes from "./routes/plans.js";
import checkinsRoutes from "./routes/checkins.js";
import adminRoutes from "./routes/admin.js";

if (config.dnsServers.length) dns.setServers(config.dnsServers);

export const app = express();
app.set("trust proxy", 1); // correct client IP behind Render / Railway / Nginx
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed =
        config.clientOrigins.includes(origin) || origin.endsWith(".vercel.app");
      cb(null, allowed);
    },
  })
);
app.use(express.json({ limit: "100kb" }));
app.use("/api", rateLimit({ windowMs: 60_000, max: 300 }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/checkins", checkinsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);

app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

// Last-resort error handler (Express 5 forwards async errors here).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON" });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request too large" });
  console.error("UNHANDLED:", err);
  res.status(500).json({ message: config.isProd ? "Something went wrong" : err.message });
});

if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 })
    .then(async () => {
      console.log("MongoDB connected");
      await mongoose.model("User").syncIndexes(); // creates the 7-day cleanup index
      app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
    })
    .catch((err) => {
      console.error("DB connection failed:", err.message);
      process.exit(1);
    });
}