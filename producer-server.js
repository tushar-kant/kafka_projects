const express = require("express");
const path = require("path");
const { kafka } = require("./client");
const cors = require("cors");
const { connectDB, getDB } = require("./db"); // Import MongoDB connection functions

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Kafka producer setup
let producer;
async function initKafkaProducer() {
  producer = kafka.producer();
  console.log("Connecting Producer...");
  await producer.connect();
  console.log("Producer Connected Successfully!");
}

initKafkaProducer();
// MongoDB setup
connectDB(); // Initialize MongoDB connection

// API to send attendance data
app.post("/send-attendance", async (req, res) => {
  const { studentName, className } = req.body;
  const timestamp = new Date().toISOString();

  if (!studentName || !className) {
    return res.status(400).json({ error: "Student name and class name are required" });
  }
  const partition = className === "Class10" ? 0 : 1;

  try {
    // Send message to Kafka
    await producer.send({
      topic: "student-attendance",
      messages: [
        {
          partition,
          key: "attendance-update",
          value: JSON.stringify({ name: studentName, class: className, timestamp }),
        },
      ],
    });

    console.log(`Sent to Kafka: ${studentName}, ${className}, ${timestamp}`);

    // Store in MongoDB
    const db = getDB();
    const attendanceCollection = db.collection("newproducer"); // Replace with your collection name

    const result = await attendanceCollection.insertOne({
      name: studentName,
      class: className,
      timestamp,
    });

    console.log("Stored in MongoDB:", result.insertedId);

    res.json({ message: "Attendance data sent successfully", data: { studentName, className, timestamp } });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to send and store attendance data" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Producer server running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Disconnecting Producer...");
  await producer.disconnect();
  console.log("Producer Disconnected!");
  process.exit();
});
