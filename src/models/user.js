const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter a name"],
    unique: true,
  },
  password: {
    type: String,
    select: false,
    minlength: [8, "Please enter a password with more than 8 characters"],
    required: [true, "Please enter a password"],
  },
  joined: {
    type: Date,
    default: Date.now(),
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordTokenExpire: {
    type: Date,
  },
  Student_ID: {
    type: String,
    required: true
  },
  class: {
    type: String,
    required: true
  },
  house: {
    type: String,
    required: false
  },
});

// userSchema.pre("save", async function (next) {
//   const salt = await bcrypt.genSalt(10);

//   if (!this.isModified("password")) {
//     next();
//   }
//   this.password = await bcrypt.hash(this.password, salt);
// });

userSchema.methods.getSignedJWT = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordTokenExpire = new Date(Date.now() + 1 * 60 * 60 * 1000);
  return resetToken;
};
const User = mongoose.model("User", userSchema);

module.exports = User;
