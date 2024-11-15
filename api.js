const express = require("express");
const { connectDB, getDB } = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/attendance/class/:className", async (req, res) => {
  const db = getDB();
  const { className } = req.params;

  const results = await db.collection("attendance").find({ class: className }).toArray();
  res.json(results);
});

app.get("/attendance/student/:studentName", async (req, res) => {
  const db = getDB();
  const { studentName } = req.params;

  const results = await db.collection("attendance").find({ name: studentName }).toArray();
  res.json(results);
});

app.get("/attendance/date/:date", async (req, res) => {
  const db = getDB();
  const { date } = req.params;

  const results = await db.collection("attendance").find({ timestamp: { $regex: date } }).toArray();
  res.json(results);
});

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
