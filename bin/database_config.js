const mongoose = require("mongoose");

const connection_url =
  process.env.DATABASE_URL?.replace(
    "<password>",
    process.env.DATABASE_PASSWORD || ""
  ) || "";

mongoose
  .connect(connection_url)
  .then((res) => {
    console.log(`Database connection successful! 👍`);
  })
  .catch((err) => {
    console.log(`Error connecting to database! 💥💥💥`);
    console.log(err);
  });

const connection = mongoose.connection;

function init() {
  console.log("Initializing database connection!");
}

module.exports = { connection, init };
