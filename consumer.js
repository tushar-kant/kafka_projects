// const { kafka } = require("./client");
// const { connectDB, getDB } = require("./db");

// async function init() {
//   await connectDB(); // Connect to MongoDB
//   const db = getDB();
//   const attendanceCollection = db.collection("attendance");

//   const consumer = kafka.consumer({ groupId: "attendance-group" });

//   console.log("Connecting Consumer...");
//   await consumer.connect();
//   console.log("Consumer Connected!");

//   await consumer.subscribe({ topics: ["student-attendance"], fromBeginning: true });

//   await consumer.run({
//     eachMessage: async ({ topic, partition, message }) => {
//       const { name, class: className, timestamp } = JSON.parse(message.value.toString());

//       console.log(`Received: Student=${name}, Class=${className}, Timestamp=${timestamp}`);

//       // Insert into MongoDB
//       await attendanceCollection.insertOne({ name, class: className, timestamp });
//       console.log("Stored in MongoDB");
//     },
//   });
// }

// init();



// const express = require("express");
// const WebSocket = require("ws");
// const { kafka } = require("./client");
// const { connectDB, getDB } = require("./db");

// const app = express();
// const PORT = 3000;

// // WebSocket Server
// const wss = new WebSocket.Server({ noServer: true });

// // Kafka Consumer
// async function init() {
//   await connectDB();
//   const db = getDB();
//   const attendanceCollection = db.collection("attendance");

//   const consumer = kafka.consumer({ groupId: "attendance-group" });

//   console.log("Connecting Consumer...");
//   await consumer.connect();
//   console.log("Consumer Connected!");

//   await consumer.subscribe({ topics: ["student-attendance"], fromBeginning: true });

//   await consumer.run({
//     eachMessage: async ({ topic, partition, message }) => {
//       const { name, class: className, timestamp } = JSON.parse(message.value.toString());

//       console.log(`Received: Student=${name}, Class=${className}, Timestamp=${timestamp}`);

//       // Store in MongoDB
//       await attendanceCollection.insertOne({ name, class: className, timestamp });
//       console.log("Stored in MongoDB");

//       // Broadcast data to all WebSocket clients
//       wss.clients.forEach((client) => {
//         if (client.readyState === WebSocket.OPEN) {
//           client.send(
//             JSON.stringify({ name, class: className, timestamp })
//           );
//         }
//       });
//     },
//   });
// }

// init();

// // HTTP Server with WebSocket support
// const server = app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// // Upgrade HTTP to WebSocket
// server.on("upgrade", (request, socket, head) => {
//   wss.handleUpgrade(request, socket, head, (ws) => {
//     wss.emit("connection", ws, request);
//   });
// });

const express = require("express");
const { connectDB, getDB } = require("./db");
const { kafka } = require("./client");

const app = express();
const PORT = 3000;

// In-memory list of clients waiting for updates
let clients = [];

app.use(express.json());

// API to send new data to clients
app.get("/attendance/stream", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Ensure the connection stays open
  res.flushHeaders();

  // Add this client to the list
  clients.push(res);

  // Remove client when the connection closes
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Consume Kafka messages and send to clients
async function consumeAttendance() {
  const consumer = kafka.consumer({ groupId: 'attendance-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['student-attendance'], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const { name, class: className, timestamp } = JSON.parse(message.value.toString());

      console.log(`Received: ${name} from ${className} at ${timestamp}`);

      // Send the new attendance data to all connected clients
      clients.forEach(client => {
        client.write(`data: ${JSON.stringify({ name, class: className, timestamp })}\n\n`);
      });
    }
  });
}

consumeAttendance();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
