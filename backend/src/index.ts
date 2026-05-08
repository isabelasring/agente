import "dotenv/config";
import cors from "cors";
import express from "express";
import chatRouter from "./routes/chat.js";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", chatRouter);

app.listen(port, () => {
  // Small runtime log for local development.
  console.log(`Agent backend running on http://localhost:${port}`);
  console.log(`Node runtime: ${process.version}`);
});
