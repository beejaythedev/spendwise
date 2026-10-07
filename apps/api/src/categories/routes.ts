import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const categorySchema = z.object({
  name: z.string().trim().min(1).max(50),
});

router.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, created_at AS "createdAt"
     FROM categories WHERE user_id = $1 ORDER BY name`,
    [req.userId],
  );
  res.json({ categories: result.rows });
});

router.post("/", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name is required (max 50 characters)" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (user_id, name) VALUES ($1, $2)
       RETURNING id, name, created_at AS "createdAt"`,
      [req.userId, parsed.data.name],
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      res
        .status(409)
        .json({ error: "You already have a category with that name" });
      return;
    }
    throw err;
  }
});

export default router;
