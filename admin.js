const { kafka } = require("./client");

async function init() {
  const admin = kafka.admin();
  console.log("Admin connecting...");
  await admin.connect();
  console.log("Admin Connection Success...");

  console.log("Creating Topic [student-attendance]");
  await admin.createTopics({
    topics: [
      {
        topic: "student-attendance",
        numPartitions: 2, // Partition by class (e.g., partition 0 for Class10, partition 1 for Class12)
      },
      {
        topic: "api-data",
        numPartitions: 2,
      },
    ],
  });
  console.log("Topic Created Success [student-attendance]");

  console.log("Disconnecting Admin...");
  await admin.disconnect();
}

init();
