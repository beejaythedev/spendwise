import express from "express";
import { config } from "./config.js";
import { pool } from "./db.js";
import authRoutes from "./auth/routes.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", db: "connected" });
});

app.use("/auth", authRoutes);

app.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, created_at FROM users WHERE id = $1",
    [req.userId],
  );
  res.json({ user: result.rows[0] });
});

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
