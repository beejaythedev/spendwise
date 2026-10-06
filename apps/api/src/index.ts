import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
