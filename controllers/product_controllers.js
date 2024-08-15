const Product = require("../models/product_model");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Factory = require("./handlerFactory");

const createProduct = Factory.createOne(Product);
const getAllProducts = Factory.getAll(Product);
const getProductById = Factory.updateOne(Product);
const updateProduct = Factory.updateOne(Product);
const deleteProduct = Factory.deleteOne(Product);

// MIDDLEWARES
const checkProductOwner = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({
    _id: req.params.id,
    seller: req.user._id,
  });

  if (!product)
    return next(
      new AppError(
        `product either doesn't exist or doesn't belong to the user`,
        400
      )
    );
  next();
});

const setSellerId = catchAsync(async (req, res, next) => {
  req.body.seller = req.user._id;
  next();
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  checkProductOwner,
  setSellerId,
};
