const express = require("express");
const cors = require("cors");
const { kafka } = require("./client");

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());


// In-memory store for consumed data
let consumedData = [];

// Kafka Consumer Setup
async function initKafkaConsumer() {
  const consumer = kafka.consumer({ groupId: "api-data-group" }); // Unique group ID for this consumer
  await consumer.connect();
  console.log("Kafka Consumer Connected Successfully!");

  await consumer.subscribe({ topic: "api-data", fromBeginning: true });

  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());
      console.log(`Received from Kafka: ${data.user_code}`);

      // Store in in-memory array (limit to the latest 100 records)
      consumedData.unshift(data);
      if (consumedData.length > 100) {
        consumedData.pop(); // Keep the array size within 100
      }
    },
  });

  return consumer;
}

// Initialize the Kafka Consumer
initKafkaConsumer().catch((err) => console.error("Error initializing Kafka consumer:", err));

// API to fetch consumed data (latest data)
app.get("/api-data", (req, res) => {
  const limit = Number(req.query.limit) || 10; // Limit the number of results (default: 10)
  res.json(consumedData.slice(0, limit)); // Return the latest `limit` records
});

// Start the server
app.listen(PORT, () => {
  console.log(`Consumer API running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down consumer...");
  process.exit();
});