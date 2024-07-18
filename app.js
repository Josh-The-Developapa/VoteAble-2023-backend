const express = require("express");
const app = express();
const mongoose = require("mongoose");
// const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const authRoutes = require("./src/routes/authRoutes");
const pollRoutes = require("./src/routes/router.js");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("./src/middleware/err");
const cookieParser = require("cookie-parser");
const helmet = require('helmet');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();
const User = require('./src/models/user.js');
const Poll = require('./src/models/polls.js');
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");

dotenv.config({ path: "config.env" });
app.use(
    cors({
        // origin: "https://voteable-app.onrender.com",
        origin: "https://voteable-app.onrender.com",
        credentials: true,
    })
);

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(morgan("dev"));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(authRoutes);
app.use(pollRoutes);
app.use(errorHandler);

const dbURL = process.env.dbURL;

mongoose.set('strictQuery', true);
mongoose
    .connect(dbURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Connected to DB"))
    .catch((err) => {
        console.log(err.message);
    });

// async function exportUsersToExcel() {
//     try {
//         // Fetch users from the database
//         const users = await User.find().select('+password');

//         // Create a new workbook and worksheet
//         const workbook = xlsx.utils.book_new();
//         const worksheetData = [['Student_ID', 'Student name', 'Password', 'Class']];

//         // Populate worksheet data
//         users.forEach(user => {
//             worksheetData.push([user.Student_ID, user.name, user.password, user.class]);
//         });

//         // Add data to worksheet
//         const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

//         // Append worksheet to workbook
//         xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');

//         // Write workbook to file
//         xlsx.writeFile(workbook, 'Users.xlsx');

//         console.log('Excel file created successfully.');
//     } catch (error) {
//         console.error('Error exporting users to Excel:', error);
//     }
// }
// exportUsersToExcel();

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${ PORT }`);
});

