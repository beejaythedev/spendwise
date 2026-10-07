import type { Request, Response, NextFunction } from "express";
import categoryRoutes from "./categories/routes.js";
import expenseRoutes from "./expenses/routes.js";
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
app.use("/categories", categoryRoutes);
app.use("/expenses", expenseRoutes);

app.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, email, created_at FROM users WHERE id = $1",
    [req.userId],
  );
  res.json({ user: result.rows[0] });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});
app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
