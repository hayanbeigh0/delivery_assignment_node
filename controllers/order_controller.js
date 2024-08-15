const mongoose = require("mongoose");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

const Order = require("../models/order_model");
const Product = require("../models/product_model");

const createOrder = catchAsync(async (req, res, next) => {
  const { productId, location } = req.body;

  // 1. Check if the productId and location exsit in the request body
  if (!productId || !location)
    return next(
      new AppError("missing required fields: productId, location", 400)
    );

  // 1.1 Check if the productId is valid
  if (!mongoose.Types.ObjectId.isValid(productId))
    return next(new AppError("Invalid productId", 400));

  // 2. Send error both address and coordinates are missing at the same time
  if (!location.address && !location.coordinates)
    return next(new AppError("address or coordinates required", 400));

  // 3. Get the product id and check if it exists
  const product = await Product.findById(productId);
  if (!product) return next(new AppError("No product found with that id", 400));

  // 4. Crate the order for the user
  const order = await Order.create({
    product: productId,
    seller: product.seller,
    buyer: req.user._id,
    price: product.price,
    buyerAddress: location,
    sellerAddress: product.location,
    status: "PLACED",
    transitLogs: [{ message: "Order Placed" }],
  });

  res.status(201).json({
    status: "success",
    message: "Order successfully placed",
    data: { order },
  });
});

const getMyOrders = catchAsync(async (req, res, next) => {
  const orderQuery = new APIFeatures(
    Order.find({ buyer: req.user._id }).populate("product").populate("buyer"),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await orderQuery.query;

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

const getMyOrderRequests = catchAsync(async (req, res, next) => {
  const orderQuery = new APIFeatures(
    Order.find({ seller: req.user._id }).populate("product").populate("buyer"),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await orderQuery.query;

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const { id } = req.params;

  if (!status) return next(new AppError('missing field "status"', 400));

  // 1. Get the order by id
  const order = await Order.findById(id);
  if (!order) return next(new AppError("No order found with that id", 400));

  // 2. Check if the order belongs to the seller
  if (order.seller.toString() !== req.user._id.toString())
    return next(
      new AppError("You are not authorized to perform this action", 401)
    );

  // 3. Set the allowed list of status based on the current order status
  const allowedStatusMappings = {
    PLACED: ["ACCEPTED", "REJECTED", "CANCELLED", "IN-TRANSIT", "FULFILED"],
    ACCEPTED: ["ACCEPTED", "CANCELLED", "IN-TRANSIT", "FULFILED"],
    REJECTED: ["REJECTED"],
    CANCELLED: ["CANCELLED"],
    FULFILED: ["FULFILED"],
    "IN-TRANSIT": ["CANCELLED", "IN-TRANSIT", "FULFILED"],
  };

  const currentMapping = allowedStatusMappings[order.status];
  if (!currentMapping)
    return next(new AppError("Status value not allowed", 400));

  if (currentMapping.indexOf(status) === -1)
    return next(
      new AppError(`Status not allowed. Allowed status are: ${currentMapping}`)
    );

  const prevOrderStatus = order.status;
  order.status = status;

  order.transitLogs = [
    ...order.transitLogs,
    {
      message: `Status changed from ${prevOrderStatus} to ${status}`,
    },
  ];

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order status successfully updated!",
    data: { order },
  });
});

const getOrder = () => {};

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderRequests,
  updateOrderStatus,
  getOrder,
};
