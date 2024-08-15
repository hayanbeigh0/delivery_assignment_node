const express = require("express");

const authController = require("../controllers/auth_controller");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.get("/verifyEmail", authController.verifyEmail);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);
router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
);
router.post("/logout", authController.logout);
router.get("/pr", authController.protect);

module.exports = router;
