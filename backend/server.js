require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;
const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(cors({
  origin: ORIGIN,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));
app.use(express.json({ limit: "10mb" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

const uploadsDir = path.join(__dirname, "uploads");
console.log("[static] /uploads ->", uploadsDir, "exists:", fs.existsSync(uploadsDir));

app.set("io", io);

const { protect, protectSocket } = require("./middlewares/authMiddleware");
const noStore = (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
app.use("/uploads", noStore, protect, express.static(uploadsDir));
io.use(protectSocket);
io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);

  socket.on("ping", () => socket.emit("pong"));
});

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const teamRoutes = require("./routes/teamRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const adRoutes = require("./routes/adRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

app.use("/api", noStore);
app.use("/api/auth", authRoutes);
app.use("/api", protect);
app.use("/api/users", userRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/notifications", protect, notificationRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/afk_productions";

if (require.main === module) mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server + Socket.IO running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
