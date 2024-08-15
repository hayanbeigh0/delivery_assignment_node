const express = require("express");

const authController = require("../controllers/auth_controller");
const orderController = require("../controllers/order_controller");

const router = express.Router();

router
  .route("/")
  .post(
    authController.protect,
    authController.restrictTo("BUYER"),
    authController.blockUnverifiedEmail,
    orderController.createOrder
  );

router
  .route("/myOrders")
  .get(
    authController.protect,
    authController.restrictTo("BUYER"),
    orderController.getMyOrders
  );

router.get(
  "/myOrderRequests",
  authController.protect,
  authController.restrictTo("SELLER"),
  orderController.getMyOrderRequests
);

router.patch(
  "/:id/updateOrderStatus",
  authController.protect,
  orderController.updateOrderStatus
);

router.route("/:id").get(authController.protect, orderController.getOrder);

module.exports = router;
