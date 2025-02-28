const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/user_model");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const { sendVerifyEmail } = require("../utils/email");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECERET, {
    expiresIn: "90d",
    // expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expiresIn: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 86400000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove the password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: "true",
    token,
    data: {
      user,
    },
  });
};

const signup = catchAsync(async (req, res, next) => {
  const randomOTP = `${crypto.randomInt(100000, 1000000)}`;
  const hashedOTP = await crypto
    .createHash("sha256")
    .update(randomOTP)
    .digest("hex");

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    photo: req.body.photo,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
    emailVerificationCode: hashedOTP,
  });

  const url = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/verifyEmail?otp=${randomOTP}&email=${req.body.email}`;
  console.log(url);
  // await new Email(newUser, url).sendWelcome();
  await sendVerifyEmail({ email: req.body.email, url });

  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if the email and password are entered
  if (!email || !password)
    return next(new AppError("Please enter your email and password", 400));

  // 2) Check if the user exists && password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.checkPassword(password, user.password)))
    return next(new AppError("incorrect email or password", 401));

  // 3) If everything is ok, send token to client
  createSendToken(user, 200, res);
});

const logout = (req, res, next) => {
  res.cookie("jwt", "logged-out", {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: "true",
  });
};

const protect = catchAsync(async (req, res, next) => {
  // 1) Getting the token and check if it is there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );

  // 2) Verification of the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECERET);

  // 3) Check if the user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError("The user belonging to this token no longer exists.", 401)
    );

  // 4) Check if user changed password after JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );

  // GRANT ACCESSS TO THE PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;

  // res.status(200).send('success');
  next();
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) return next();

    next(new AppError("You are not authorized to perform this action.", 403));
  };
};

const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) return next(new AppError("No user found with that id", 400));

  // 2) Generate the random token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const url = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? send a PATCH request to ${url} with your password and passwordConfirm.\nIf you didn't forget your password, please ignore this email.`;

  /* TO BE ACTIVATED WHEN THE MAILTRAP IS READY */

  try {
    // await sendEmail({
    //    email: user.email,
    //    subject: 'Your password reset token. valid for 10 min.',
    //    message
    // });

    console.log("RESET TOKEN: ", resetToken);

    res.status(200).json({
      status: "success",
      message: "Token send to the email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email! Please try again later.",
        500
      )
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() },
  });

  if (!user) return next(new AppError("The token is invalid or has expired"));

  // 2) Set the new password if the token has not expired and there is a user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 3) Update changedPasswordAt property for the current user
  // is done by the pre-save middleware

  // 4) Log the user in. send JWT
  createSendToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, password, passwordConfirm } = req.body;

  // 1) Get the user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if the POSTed password is correct
  if (!(await user.checkPassword(currentPassword, user.password)))
    return next(new AppError("Incorrect password! Please try again", 401));

  // 3) If so, update the password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

const verifyEmail = catchAsync(async (req, res, next) => {
  const { otp, email } = req.query;

  const user = await User.findOne({ email });
  if (!user) return next("No user found with that email", 400);

  // 1. CHECK: Verify if the otp is correct
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

  if (user.emailVerificationCode !== hashedOTP)
    return next(new AppError("Invalid code", 401));

  user.emailVerified = true;
  await user.save();

  res.status(200).json({
    staus: "success",
    message: "Email verification successful",
  });
});

const blockUnverifiedEmail = catchAsync(async (req, res, next) => {
  if (!req.user.emailVerified)
    // return next(
    //   new AppError(
    //     "Email not verified. Please verify email before continuing.",
    //     400
    //   )
    // );
    throw {
      message: "Email not verified. Please verify email before continuing.",
      statusCode: 401,
      errorCode: "0001",
    };

  next();
});

module.exports = {
  signup,
  login,
  logout,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  verifyEmail,
  blockUnverifiedEmail,
};
