const crypto = require("crypto");

const mongoose = require("mongoose");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

const Delivery = require("../models/delivery_model");
const Order = require("../models/order_model");

const requestDelivery = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  // 1. Check if the order actually exists
  const order = await Order.findById(orderId);
  if (!order) return next(new AppError("No order found with that Id", 400));

  // CHECK: Verify if the order has been already requested for delivery
  const activeDelivery = await Delivery.findOne({ order: orderId });
  if (activeDelivery)
    return next(
      new AppError("Order has already been requested for delivery", 400)
    );

  // 2. Check if the seller belongs to the order
  if (order.seller.toString() !== req.user._id.toString())
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );

  const randomOTP = `${crypto.randomInt(100000, 1000000)}`;
  const hashedOTP = await crypto
    .createHash("sha256")
    .update(randomOTP)
    .digest("hex");

  // Create the transaction
  // const session = await mongoose.startSession();
  // session.startTransaction();

  // 3. Create the delivery document
  const session = undefined;

  const delivery = await Delivery.create({
    order: order._id,
    pickupAddress: order.sellerAddress,
    dropAddress: order.buyerAddress,
    deliveryCode: hashedOTP,
  });

  if (!delivery) return next(new AppError("Couldnt create delivery", 400));

  // 4. Update the order status
  order.status = "IN-TRANSIT";
  await order.save({ session });

  // await session.commitTransaction();
  // session.endSession();

  res.status(201).json({
    status: "success",
    message: "delivery successfully requested",
    data: { delivery },
  });
});

const getInitiatedDeliveries = catchAsync(async (req, res, next) => {
  const initiatedDeliveriesQuery = new APIFeatures(
    Delivery.find({ deliveryStatus: "INITIATED" }).populate({
      path: "order",
      populate: [
        {
          path: "buyer",
        },
        {
          path: "seller",
        },
      ],
    }),
    req.query
  );

  const initiatedDeliveries = await initiatedDeliveriesQuery.query;

  res.status(200).json({
    status: "success",
    results: initiatedDeliveries.length,
    data: {
      deliveries: initiatedDeliveries,
    },
  });
});

const requestDeliveryJob = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new AppError("Invalid id", 400));

  // 1. CHECK: Verify that the user has no active deliveries
  const activeDelivery = await Delivery.findOne({
    fulfilmentPartner: req.user._id,
    active: true,
  });

  if (activeDelivery)
    return next(
      new AppError(
        "You already have an active delivery. Please fulfil the delivery before requesting another delivery",
        400
      )
    );

  // 2. CHECK: Verify that the delivery exists
  const deliveryDoc = await Delivery.findById(id);
  if (!deliveryDoc)
    return next(new AppError("No delivery found with that id", 400));

  // 3. CHECK: Verify that the delivery hasn't been already assigned fulfilment partner
  if (deliveryDoc.fulfilmentPartner)
    return next(
      new AppError(
        "The delivery has already been assigned a fulfilment partner",
        400
      )
    );

  // 4. Assign the user as the fulfilment partner for the delivery
  deliveryDoc.fulfilmentPartner = req.user._id;
  deliveryDoc.deliveryStatus = "PARTNER-ASSIGNED";
  await deliveryDoc.save();

  res.status(200).json({
    status: "success",
    data: {
      delivery: deliveryDoc,
    },
  });
});

const changeDeliveryStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  // CHECK: Verify if the status exist in the request body
  if (!status) return next(new AppError("Mising field: status"), 400);

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new AppError("Invalid id", 400));

  // 1. CHECK: Verify if the delivery with that id exists
  const delivery = await Delivery.findById(id);
  if (!delivery)
    return next(new AppError("No delevery found with that id", 400));

  // 2. CHECK: Verify if the delivery actually has a fulfilment partner
  if (!delivery.fulfilmentPartner)
    return next(
      new AppError(
        "This delivery job is not fulfiled yet. Please request the job and try again",
        401
      )
    );

  // 3. CHECK: Verify if the fulfilment partner in the delivery document is same as the request user
  if (delivery.fulfilmentPartner.toString() !== req.user._id.toString())
    return next(
      new AppError("You are not authorized to perform this action", 400)
    );

  // 4. Set the allowed list of status based on the current delivery status
  const allowedStatusMappings = {
    INITIATED: [],
    "PARTNER-ASSIGNED": ["PICKEDUP"],
    PICKEDUP: [],
    FULFILED: [],
  };

  const currentMapping = allowedStatusMappings[delivery.deliveryStatus];
  if (currentMapping.indexOf(status) === -1)
    return next(
      new AppError(
        `${
          currentMapping.length === 0
            ? "Not allowed to change status at the moment"
            : `Status not allowed. Allowed status are: ${currentMapping}`
        }, 400`
      )
    );

  delivery.deliveryStatus = status;
  await delivery.save();

  res.status(200).json({
    status: "success",
    message: "status successfully updated",
    data: {
      delivery,
    },
  });
});

const getMyDeleveries = catchAsync(async (req, res, next) => {
  const deliveryQuery = new APIFeatures(
    Delivery.find({ fulfilmentPartner: req.user._id, active: false }, req.query)
  );

  const deliveryDocs = await deliveryQuery.query;

  res.status(200).json({
    status: "success",
    results: deliveryDocs.length,
    data: {
      deliveries: deliveryDocs,
    },
  });
});

const getMyActiveDelivery = catchAsync(async (req, res, next) => {
  const activeDelivery = await Delivery.findOne({
    fulfilmentPartner: req.user._id,
    active: true,
  }).populate({
    path: "order",
    populate: [
      {
        path: "buyer",
      },
      {
        path: "seller",
      },
    ],
  });

  if (!activeDelivery)
    return next(new AppError("No active delivery found for you", 400));

  res.status(200).json({
    status: "success",
    data: {
      delivery: activeDelivery,
    },
  });
});

const fulfilDelivery = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new AppError("Invalid id", 400));

  // 1. CHECK: Verify if the delivery document exists
  const delivery = await Delivery.findById(id);
  if (!delivery)
    return next(new AppError("No delivery found with that id", 400));

  // 2. CHECK: Verify if the delivery has a fulfilment partner
  if (!delivery.fulfilmentPartner)
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );

  // 2. CHECK: Verify if the fulfilment partner is the requesting user
  if (delivery.fulfilmentPartner.toString() !== req.user._id.toString())
    return next(
      new AppError("You are not authorized to perform this action", 400)
    );

  // 3. CHECK: Verify if the delivery document is active
  if (!delivery.active)
    return next(
      new AppError(
        "Delivery inactive. You are not authorized to perform this action",
        401
      )
    );

  // 4. Fulfil the delivery and set the active to false
  delivery.deliveryStatus = "FULFILED";
  delivery.active = false;

  const updatedOrderPromise = Order.findByIdAndUpdate(delivery.order, {
    status: "FULFILED",
  });

  const deliveryPromise = delivery.save();

  await Promise.all([updatedOrderPromise, deliveryPromise]);

  res.status(200).json({
    status: "success",
    message: "Delivery successfully fulfiled!",
  });
});

module.exports = {
  requestDelivery,
  getInitiatedDeliveries,
  requestDeliveryJob,
  changeDeliveryStatus,
  getMyDeleveries,
  getMyActiveDelivery,
  fulfilDelivery,
};
