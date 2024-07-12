const router = require("express").Router();
const {
    signup,
    findUser,
    login,
    logout,
    forgotPassword,
    resetPassword,
} = require("../controllers/authController");

router.post("/v1/signup", signup);
router.get("/v1/my-profile", findUser);
router.post("/v1/login", login);
router.get("/v1/logout", logout);
router.post("/v1/forgot-password", forgotPassword);
router.post("/v1/reset-password/:resetToken", resetPassword);

module.exports = router;
