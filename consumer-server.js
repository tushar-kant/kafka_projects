const express = require("express");
const { connectDB, getDB } = require("./db");
const cors = require("cors"); // Import the cors package
const { kafka } = require("./client");

const app = express();
const PORT = 3000;

app.use(cors()); // This allows all domains to access your API
app.use(express.json());

// In-memory list of clients waiting for updates
let clients = [];

// In-memory store for historical attendance data
let attendanceData = [];

// API to send new data to clients
app.get("/attendance/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send all historical attendance data to the client
  attendanceData.forEach(data => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  // Ensure the connection stays open
  res.flushHeaders();

  // Add this client to the list
  clients.push(res);

  // Remove client when the connection closes
  req.on("close", () => {
    clients = clients.filter(client => client !== res);
  });
});

// Consume Kafka messages and send to clients
async function consumeAttendance() {
  // Initialize Kafka consumer
  const consumer = kafka.consumer({ groupId: "attendance-group" });
  await consumer.connect();
  await consumer.subscribe({ topics: ["student-attendance"], fromBeginning: true });

  // Connect to MongoDB
  await connectDB(); // Ensure the MongoDB connection is initialized

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const { name, class: className, timestamp } = JSON.parse(message.value.toString());

      console.log(`Received: ${name} from ${className} at ${timestamp}`);

      // Store the consumed message in MongoDB
      try {
        const db = getDB();
        const attendanceCollection = db.collection("consumer");

        const result = await attendanceCollection.insertOne({
          name,
          class: className,
          timestamp,
          topic,
          partition,
        });

        console.log("Stored in MongoDB:", result.insertedId);
      } catch (error) {
        console.error("Error storing message in MongoDB:", error);
      }

      // Add the new data to the in-memory store
      const newData = { name, class: className, timestamp };
      attendanceData.unshift(newData); // Add the new data to the top

      // Send the new attendance data to all connected clients
      clients.forEach(client => {
        client.write(`data: ${JSON.stringify(newData)}\n\n`);
      });
    },
  });
}

consumeAttendance().catch(error => {
  console.error("Error consuming Kafka messages:", error);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
