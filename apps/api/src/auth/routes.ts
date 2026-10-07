import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db.js";
import { config } from "../config.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

router.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Valid email and password (min 8 characters) required" });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, passwordHash],
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const result = await pool.query(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0];

  const valid =
    user && (await bcrypt.compare(parsed.data.password, user.password_hash));
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: "1h",
  });
  res.json({ token });
});

export default router;
