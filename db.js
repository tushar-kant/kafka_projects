const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://tusharkantanayak713:lGHOqTcn7T7CNUNB@cluster0.kdxuaal.mongodb.net/driver?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("riderUpdatesDB"); // Replace with your DB name
    console.log("MongoDB connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

function getDB() {
  if (!db) throw new Error("Database not connected");
  return db;
}

module.exports = { connectDB, getDB };
