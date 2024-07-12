const User = require("../models/user");
const ErrorResponse = require("../Utils/errorResponse");
const sendEmail = require("../Utils/email.js");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const sendTokenResponse = (user, res, statusCode) => {
    const token = user.getSignedJWT();
    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        secure: false,
        httpOnly: false,
    };
    res.cookie("jwt", token, options);

    res.status(statusCode).json({
        success: true,
        token,
        message: `Welcome to VoteAble, ${ user.name }`,
    });
};

module.exports.signup = async function (req, res, next) {
    try {
        if (req.cookies.jwt) {
            return next(new ErrorResponse("You are already logged in", 400));
        }

        const user = await User.create({
            name: req.body.name,
            password: req.body.password,
            class: req.body.class,
            Student_ID: req.body.Student_ID,
            house: req.body.house
        });

        sendTokenResponse(user, res, 200);
    } catch (err) {
        next(err);
    }
};

module.exports.login = async function (req, res, next) {
    if (req.cookies.jwt) {
        return next(new ErrorResponse("You are already logged in", 400));
    }

    const user = await User.findOne({ name: req.body.name }).select("+password");

    if (!user) {
        return next(new ErrorResponse("Invalid credentials, try again", 400));
    }

    const isMatch = await user.matchPassword(req.body.password);
    if (!isMatch) {
        return next(new ErrorResponse("Invalid password", 400));
    }
    sendTokenResponse(user, res, 200);
};

module.exports.logout = async function (req, res, next) {
    if (!req.cookies.jwt) {
        return next(new ErrorResponse("Already logged out", 400));
    }

    res.cookie("jwt", "none", { expires: new Date() });
    res.json({
        success: true,
        message: "Successfully logged out",
    });
};

module.exports.findUser = async function (req, res, next) {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return next(new ErrorResponse("You have to login / signup first", 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.id });
        // console.log(user);

        res.json({
            success: true,
            user,
        });
    } catch (err) {
        const message = `No user with id of ${ err.value } found`;
        return next(new ErrorResponse(message, 404));
    }
};

module.exports.forgotPassword = async function (req, res, next) {
    if (req.cookies.jwt) {
        return next(
            new ErrorResponse("You must be signed out to access this route", 401)
        );
    }

    const { email, name } = req.body;
    const user = await User.findOne({ name });

    if (!email || !email.includes("@") || !email.includes(".")) {
        return next(new ErrorResponse("Please enter a valid email", 400));
    }

    if (!user) {
        return next(new ErrorResponse("Enter your exact username here", 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const message = `Greetings, this email was sent for the purpose of delivering your password reset link, kindly receive it below \n\n
    This link will expire at ${ user.resetPasswordTokenExpire.toLocaleTimeString() } and when it does, you will have to repeat this process \n\n`;

    const url = `${ req.protocol }://${ req.get("host") }/v1/reset-password/${ resetToken }`;
    const text = `${ message }${ url }`;

    const html = `<p>Greetings, this email was sent for the purpose of delivering your password reset link, kindly receive it below</p><br><a href="${ url }">Reset link</a>
  <br>This link will expire at ${ user.resetPasswordTokenExpire.toLocaleTimeString() } and when it does, you will have to repeat this process`;

    try {
        await sendEmail({
            email,
            subject: "Password reset link",
            text,
            html,
        });

        res.json({
            success: true,
            message: "Email successfully sent",
            time: user.resetPasswordTokenExpire,
        });
    } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpire = undefined;
        await user.save({ validateBeforeSave: false });
        next(err);
    }
};

module.exports.resetPassword = async function (req, res, next) {
    try {
        if (req.cookies.jwt) {
            return next(new ErrorResponse("You are already logged in", 400));
        }

        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(req.params.resetToken)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordTokenExpire: { $gt: Date.now() },
        });

        if (!user) {
            return next(new ErrorResponse("Invalid token", 404));
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpire = undefined;

        await user.save();
        sendTokenResponse(user, res, 200);
    } catch (err) {
        next(err);
    }
};
