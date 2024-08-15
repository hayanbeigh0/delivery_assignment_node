process.on("uncaughtException", (err) => {
  console.log("uncaught Exception! Shutting down");
  console.log(err);
  process.exit(1);
});

// import dotenv from "dotenv";
const dotenv = require("dotenv");

// Configure environment variables
dotenv.config({ path: "config.env" });

const http = require("http");
const https = require("https");
const fs = require("fs");

const socketIo = require("socket.io");

const database = require("./database_config");
const app = require("../app");

// CONNECT TO DATABASE: (to use require is essential here: require will execute the code in the database_config file). Alternatively, we can simply call a void function from the database_config module which will trigger the entire code execution.
// const connection = require("../bin/database_config");
database.init();

// CONFIGURE SERVER (HTTP & HTTPS)
const http_server = http.createServer(app);

const io = new socketIo.Server(http_server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  const orderId = socket.handshake.query.orderId;

  // Join the room with the order ID
  socket.join(orderId);

  // Listen for location updates from the delivery partner
  socket.on("locationUpdate", (locationData) => {
    // if (socket.user.role === "deliveryPartner") {
    // Broadcast location to the buyer in the same room
    // }

    io.to(orderId).emit("locationUpdate", locationData);
  });
});

const https_server = https.createServer(
  {
    key: fs.readFileSync(`${__dirname}/cert/server.key.pem`, "utf-8"),
    cert: fs.readFileSync(`${__dirname}/cert/server.cert.pem`, "utf-8"),
    ca: fs.readFileSync(`${__dirname}/cert/ca.cert.pem`, "utf-8"),
  },
  app
);

// Server ports
console.log("these are the ports: ", {
  http_port: process.env.HTTP_PORT,
  https_port: process.env.HTTPS_PORT,
});
const http_port = +(process.env.HTTP_PORT || 3000);
const https_port = +(process.env.HTTPS_PORT || 3443);

http_server.on("listening", () => {
  console.log(`HTTP server running on port ${http_port}`);
});

http_server.on("error", (err) => {
  console.log(`Error starting HTTP server 💥💥💥`, err);
});

https_server.on("listening", () => {
  console.log(`HTTPS server running on port ${https_port}`);
});

https_server.on("error", (err) => {
  console.log(`Error starting HTTPS server 💥💥💥`, err);
});

// Start server (HTTP & HTTPS)
http_server.listen(http_port, "0.0.0.0", 0);

if (process.env.MANUAL_HTTPS === "true")
  https_server.listen(https_port, "0.0.0.0", 0);

process.on("unhandledRejection", (err) => {
  console.log("unhandled rejection... Exiting application");
  console.log(err.name, err.message);
  console.log(err);

  http_server.close(() => {
    process.exit(1);
  });

  if (process.env.MANUAL_HTTPS === "true") {
    https_server.close(() => {
      process.exit(1);
    });
  }
});

module.exports = { http_server, io };
