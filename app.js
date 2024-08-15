const global_error_controller = require("./controllers/error_controller");
const AppError = require("./utils/appError");

const router = require("./routes");
const express = require("express");
const helmet = require("helmet");
const cookie_parser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const express_useragent = require("express-useragent");
const compression = require("compression");

const app = express();

// Development Request Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Helmet
app.use(helmet());

// Body Parser
app.use(express.json());

// Cookie Parser
app.use(cookie_parser());

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// app.use(express.static("public"));

// Parse the user-agent
app.use(express_useragent.express());
// console.log(req.headers['user-agent']);

// Compression
app.use(compression());

app.use((req, res, next) => {
  next();
});

// Mount the router
app.use("/api/v1/", router);

// Global Error handling middleware:
app.use(global_error_controller);

// Handle NOT FOUND requests:
app.all("*", (req, res, next) => {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server!`, 404)
  );
});

module.exports = app;
