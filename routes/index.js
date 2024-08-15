const express = require("express");

const auth_router = require("./auth_router");
const productsRouter = require("./product_router");
const orderRouter = require("./order_router");
const deliveryRouter = require("./delivery_router");

const router = express.Router();

router.route("/health", (req, res) => {
  res.stats(200).json({
    status: "success",
  });
});

router.use("/auth", auth_router);
router.use("/products", productsRouter);
router.use("/orders", orderRouter);
router.use("/delivery", deliveryRouter);

module.exports = router;
