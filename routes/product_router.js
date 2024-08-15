const express = require("express");
const productController = require("../controllers/product_controllers");
const authController = require("../controllers/auth_controller");

const router = express.Router();

router
  .route("/")
  .post(
    authController.protect,
    authController.restrictTo("SELLER"),
    productController.setSellerId,
    productController.createProduct
  )
  .get(productController.getAllProducts);

router
  .route("/:id")
  .get(productController.getProductById)
  .patch(
    authController.protect,
    productController.checkProductOwner,
    productController.updateProduct
  )
  .delete(
    authController.protect,
    productController.checkProductOwner,
    productController.deleteProduct
  );

module.exports = router;
