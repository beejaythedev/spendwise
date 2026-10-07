import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

const expenseSchema = z.object({
  amountCents: z.number().int().positive(),
  description: z.string().max(200).optional(),
  spentOn: z.iso.date().optional(),
  categoryId: z.uuid().nullable().optional(),
});

const idSchema = z.uuid();

const listQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

const columns = `id, amount_cents AS "amountCents", description,
  to_char(spent_on, 'YYYY-MM-DD') AS "spentOn",
  category_id AS "categoryId", created_at AS "createdAt"`;

async function categoryBelongsToUser(categoryId: string, userId: string) {
  const result = await pool.query(
    "SELECT 1 FROM categories WHERE id = $1 AND user_id = $2",
    [categoryId, userId],
  );
  return result.rowCount === 1;
}

// Create
router.post("/", async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid expense", details: parsed.error.issues });
    return;
  }

  const { amountCents, description, spentOn, categoryId } = parsed.data;
  if (categoryId && !(await categoryBelongsToUser(categoryId, req.userId!))) {
    res.status(400).json({ error: "Unknown category" });
    return;
  }

  const result = await pool.query(
    `INSERT INTO expenses (user_id, amount_cents, description, spent_on, category_id)
     VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5)
     RETURNING ${columns}`,
    [
      req.userId,
      amountCents,
      description ?? null,
      spentOn ?? null,
      categoryId ?? null,
    ],
  );
  res.status(201).json({ expense: result.rows[0] });
});

// List, optionally filtered by month: /expenses?month=2026-10
router.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "month must look like 2026-10" });
    return;
  }

  const params: unknown[] = [req.userId];
  let sql = `SELECT ${columns} FROM expenses WHERE user_id = $1`;

  if (parsed.data.month) {
    params.push(`${parsed.data.month}-01`);
    sql += ` AND spent_on >= $2::date AND spent_on < ($2::date + INTERVAL '1 month')`;
  }

  sql += " ORDER BY spent_on DESC, created_at DESC";
  const result = await pool.query(sql, params);
  res.json({ expenses: result.rows });
});

// Read one
router.get("/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const result = await pool.query(
    `SELECT ${columns} FROM expenses WHERE id = $1 AND user_id = $2`,
    [id.data, req.userId],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json({ expense: result.rows[0] });
});

// Update (full replace)
router.put("/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid expense", details: parsed.error.issues });
    return;
  }

  const { amountCents, description, spentOn, categoryId } = parsed.data;
  if (categoryId && !(await categoryBelongsToUser(categoryId, req.userId!))) {
    res.status(400).json({ error: "Unknown category" });
    return;
  }

  const result = await pool.query(
    `UPDATE expenses
     SET amount_cents = $3, description = $4,
         spent_on = COALESCE($5::date, spent_on), category_id = $6
     WHERE id = $1 AND user_id = $2
     RETURNING ${columns}`,
    [
      id.data,
      req.userId,
      amountCents,
      description ?? null,
      spentOn ?? null,
      categoryId ?? null,
    ],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json({ expense: result.rows[0] });
});

// Delete
router.delete("/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const result = await pool.query(
    "DELETE FROM expenses WHERE id = $1 AND user_id = $2",
    [id.data, req.userId],
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.status(204).end();
});

export default router;
