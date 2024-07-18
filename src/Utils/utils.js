const User = require("../models/user"); // Adjust the path as needed
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const xlsx = require("xlsx");

// Function to parse Excel file and create user accounts
const createUsersFromExcel = async (filePath) => {

    // Function to generate a random password
    const generatePassword = (length = 8) => {
        return crypto.randomBytes(length).toString("base64").slice(0, length);
    };

    // Function to generate a unique Student ID
    const generateStudentID = async () => {
        let id;
        let exists = true;

        while (exists) {
            id = crypto.randomBytes(5).toString("hex");
            exists = await User.findOne({ Student_ID: id });
        }

        return id;
    };

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip the first row (headers)
    const users = data.slice(1);

    for (const row of users) {
        const [name, className] = row;

        if (!name || !className) {
            // Skip rows with empty cells
            continue;
        }

        // Trim the data
        const trimmedName = name.trim();
        const trimmedClass = className.trim();

        // Generate password and Student ID
        const password = generatePassword();
        const studentID = await generateStudentID();

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(password, salt);

        // Create the user
        const newUser = new User({
            name: trimmedName,
            password: password,
            Student_ID: studentID,
            class: trimmedClass,
        });

        await newUser.save();
    }

    console.log("User accounts created successfully!");
};



/**
 * Export users to an Excel file.
 * Fetches users from the database, creates a new workbook and worksheet,
 * populates the worksheet with user data, appends the worksheet to the workbook,
 * and writes the workbook to a file named 'Users.xlsx'.
 * If an error occurs, the error is logged to the console.
 */
async function exportUsersToExcel() {
    try {
        // Fetch users from the database
        const users = await User.find().select('+password');

        // Create a new workbook and worksheet
        const workbook = xlsx.utils.book_new();

        // Initialize worksheet data with headers
        const worksheetData = [['Student_ID', 'Student name', 'Password']];

        // Populate worksheet data with user data
        users.forEach(user => {
            worksheetData.push([user.Student_ID, user.name, user.password]);
        });

        // Convert worksheet data to worksheet
        const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

        // Append worksheet to workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');

        // Write workbook to file
        xlsx.writeFile(workbook, 'Users.xlsx');

        console.log('Excel file created successfully.');
    } catch (error) {
        console.error('Error exporting users to Excel:', error);
    }
}
