const express = require("express");

const authController = require("../controllers/auth_controller");
const deliveryController = require("../controllers/deliveryController");

const router = express.Router();

router
  .route("/")
  .post(
    authController.protect,
    authController.restrictTo("SELLER"),
    deliveryController.requestDelivery
  );

router
  .route("/initiated")
  .get(
    authController.protect,
    authController.restrictTo("DELIVERY"),
    deliveryController.getInitiatedDeliveries
  );

router
  .route("/myDeliveries")
  .get(
    authController.protect,
    authController.restrictTo("DELIVERY"),
    deliveryController.getMyDeleveries
  );

router
  .route("/myActiveDeliveries")
  .get(
    authController.protect,
    authController.restrictTo("DELIVERY"),
    deliveryController.getMyActiveDelivery
  );

router
  .route("/:id/requestJob")
  .post(
    authController.protect,
    authController.restrictTo("DELIVERY"),
    deliveryController.requestDeliveryJob
  );

router
  .route("/:id/fulfilDelivery")
  .patch(
    authController.protect,
    authController.restrictTo("DELIVERY"),
    deliveryController.fulfilDelivery
  );

router
  .route("/:id/updateStatus")
  .patch(
    authController.protect,
    authController.restrictTo("DELIVERY"),
    deliveryController.changeDeliveryStatus
  );

module.exports = router;
