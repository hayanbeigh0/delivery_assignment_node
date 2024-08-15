const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.ObjectId,
    ref: "Order",
    required: true,
    unique: true,
  },
  fulfilmentPartner: {
    type: mongoose.Schema.ObjectId,
    ref: "Order",
  },
  pickupAddress: {
    type: { type: String, default: "Point", enum: ["Point"] },
    coordinates: [Number],
    address: String,
    pin: Number,
  },
  dropAddress: {
    type: { type: String, default: "Point", enum: ["Point"] },
    coordinates: [Number],
    address: String,
    pin: Number,
  },
  deliveryStatus: {
    type: String,
    enum: ["INITIATED", "PARTNER-ASSIGNED", "PICKEDUP", "FULFILED"],
    default: "INITIATED",
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
    required: true,
  },
  deliveryCode: {
    type: String,
  },
});

const Delivery = mongoose.model("Delivery", deliverySchema);

module.exports = Delivery;
