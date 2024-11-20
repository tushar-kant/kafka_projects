const express = require("express");
const axios = require("axios");
const { kafka } = require("./client");

const app = express();
const PORT = 3001;

app.use(express.json());

// Kafka producer setup
let producer;
async function initKafkaProducer() {
  producer = kafka.producer();
  console.log("Connecting Producer...");
  await producer.connect();
  console.log("Producer Connected Successfully!");

  // Start auto-fetching data after Kafka producer is ready
  await autoFetchAndSend();
}

// Function to fetch data from API and send to Kafka
async function autoFetchAndSend() {
  const API_URL = "https://erp.cgu-odisha.ac.in/API/DataForLmsIntegration.php";
  const params = {
    sec_key: "e4470611-8e76-4b09-808d-3950125413da",
    limit: 10,
    offset: 1,
  };

  try {
    console.log("Fetching data from API...");
    // Fetch data from the API
    const response = await axios.get(API_URL, { params });
    const { data, status } = response.data;

    if (status !== 200) {
      console.error("Failed to fetch data from API. Status:", status);
      return;
    }

    console.log("Fetched data from API:", data);

    // Send data to Kafka
    for (const item of data) {
      await producer.send({
        topic: "api-data", // Ensure the topic exists in Kafka
        messages: [
          {
            key: item.user_code,
            value: JSON.stringify(item),
          },
        ],
      });
    }

    console.log("Data sent to Kafka successfully.");
  } catch (error) {
    console.error("Error fetching or sending data:", error);
  }
}

// API to fetch data and send to Kafka manually
app.get("/fetch-and-send", async (req, res) => {
  try {
    await autoFetchAndSend();
    res.json({ message: "Data sent to Kafka successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch or send data" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Disconnecting Producer...");
  await producer.disconnect();
  console.log("Producer Disconnected!");
  process.exit();
});

// Initialize Kafka producer and start auto-fetching
initKafkaProducer();
