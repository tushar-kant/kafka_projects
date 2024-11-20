// const express = require("express");
// const cors = require("cors");
// const { kafka } = require("./client");

// const app = express();
// const PORT = 3002;

// app.use(cors());
// app.use(express.json());


// // In-memory store for consumed data
// let consumedData = [];

// // Kafka Consumer Setup
// async function initKafkaConsumer() {
//   const consumer = kafka.consumer({ groupId: "api-data-group" }); // Unique group ID for this consumer
//   await consumer.connect();
//   console.log("Kafka Consumer Connected Successfully!");

//   await consumer.subscribe({ topic: "api-data", fromBeginning: true });

//   consumer.run({
//     eachMessage: async ({ topic, partition, message }) => {
//       const data = JSON.parse(message.value.toString());
//       console.log(`Received from Kafka: ${data.user_code}`);

//       // Store in in-memory array (limit to the latest 100 records)
//       consumedData.unshift(data);
//       if (consumedData.length > 100) {
//         consumedData.pop(); // Keep the array size within 100
//       }
//     },
//   });

//   return consumer;
// }

// // Initialize the Kafka Consumer
// initKafkaConsumer().catch((err) => console.error("Error initializing Kafka consumer:", err));

// // API to fetch consumed data (latest data)
// app.get("/api-data", (req, res) => {
//   const limit = Number(req.query.limit) || 10; // Limit the number of results (default: 10)
//   res.json(consumedData.slice(0, limit)); // Return the latest `limit` records
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Consumer API running on http://localhost:${PORT}`);
// });

// process.on("SIGINT", async () => {
//   console.log("Shutting down consumer...");
//   process.exit();
// });
const express = require("express");
const cors = require("cors");
const { kafka } = require("./client");
const { Pool } = require("pg");
const axios = require("axios");

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// PostgreSQL Client Setup (keeping this in case you still need it later)
const pool = new Pool({
  user: "postgres",       // Replace with your PostgreSQL username (default: 'postgres')
  host: "localhost",      // Replace with your PostgreSQL host (e.g., 'localhost' or server IP)
  database: "test_kafka", // Replace with your PostgreSQL database name
  password: "1qaz!QAZ", // Replace with your PostgreSQL password
  port: 5432,             // Default PostgreSQL port (update if different)
});

// In-memory store to temporarily hold Kafka 1data
let kafkaDataStore = [];

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

      try {
        // Temporarily store the received Kafka message
        kafkaDataStore.push(data);

        // Optionally: Insert data into PostgreSQL (if needed)
        await pool.query(
          `INSERT INTO kafka_data (
            institute_code, user_code, user_name, full_name, email_id, role_code, phone_no, 
            first_name, last_name, dob, profile_image_url, is_lms, lms_ref_id, roll_no, 
            batch_code, course_code, branch_code, semester_code
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          )`,
          [
            data.institute_code,
            data.user_code,
            data.user_name,
            data.full_name,
            data.email_id,
            data.role_code,
            data.phone_no,
            data.first_name,
            data.last_name,
            data.dob,
            data.profile_image_url,
            data.is_lms,
            data.lms_ref_id,
            data.roll_no,
            data.batch_code,
            data.course_code,
            data.branch_code,
            data.semester_code,
          ]
        );
        console.log("Data inserted into PostgreSQL successfully!");
      } catch (err) {
        console.error("Error processing message:", err);
      }
    },
  });

  return consumer;
}

// Initialize the Kafka Consumer
initKafkaConsumer().catch((err) =>
  console.error("Error initializing Kafka consumer:", err)
);

// API to fetch data from Kafka (not PostgreSQL)
app.get("/api-data", async (req, res) => {
  const limit = Number(req.query.limit) || 10; // Limit the number of results (default: 10)
  try {
    // Fetch the latest `limit` number of messages from the Kafka data store
    const dataToSend = kafkaDataStore.slice(0, limit); // Take first `limit` messages
    res.json(dataToSend);
  } catch (err) {
    console.error("Error fetching data from Kafka:", err);
    res.status(500).json({ error: "Failed to fetch data from Kafka" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Consumer API running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down consumer...");
  process.exit();
});
