const { kafka } = require("./client");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function init() {
  const producer = kafka.producer();

  console.log("Connecting Producer...");
  await producer.connect();
  console.log("Producer Connected Successfully!");

  rl.setPrompt("> ");
  rl.prompt();

  rl.on("line", async function (line) {
    const [studentName, className, timestamp] = line.split(" ");
    if (!studentName || !className || !timestamp) {
      console.log("Format: <studentName> <className> <timestamp>");
      rl.prompt();
      return;
    }

    const partition = className === "Class10" ? 0 : 1;

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

    console.log(`Sent: ${studentName}, ${className}, ${timestamp}`);
    rl.prompt();
  }).on("close", async () => {
    console.log("Disconnecting Producer...");
    await producer.disconnect();
    console.log("Producer Disconnected!");
  });
}

init();
