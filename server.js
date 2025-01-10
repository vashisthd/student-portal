const express = require('express');
const { Pool } = require('pg'); // PostgreSQL client
const bcrypt = require('bcrypt'); // For password hashing
const session = require('express-session'); // Session middleware
const app = express();
const path = require('path');
const bodyParser = require('body-parser');

// Set up PostgreSQL connection pool (this should be done only once)
const pool = new Pool({
    user: 'postgres',    // Database username (since you are using 'postgres')
    host: 'localhost',   // Database host (localhost for local development)
    database: 'student_portal', // Your database name
    password: 'Deepak@2113', // Your password for the 'postgres' user
    port: 5432,          // PostgreSQL default port
});

// Middleware to parse incoming JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware setup
app.use(session({
    secret: 'your-secret-key', // Secret key for signing session cookies
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Login Route (authenticate with plain-text password)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query the database to find the user by username
        const result = await pool.query('SELECT * FROM students WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log(user);
            // Compare plain-text password (NO hashing)
            if (user.password === password) {
                // Store the username in session
                req.session.username = username; 
                // If passwords match, login is successful
                res.send('Login successful!');
            } else {
                // If password doesn't match, send an error
                res.send('Invalid credentials');
            }
        } else {
            // If user not found, send an error
            res.send('User not found');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('An error occurred');
    }
});

// Register Route (create new user with hashed password)
app.post('/register', async (req, res) => {
    const { username, password, full_name, email } = req.body;

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into the database
        const result = await pool.query(
            'INSERT INTO students (username, password, full_name, email) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, hashedPassword, full_name, email]
        );

        res.send('Registration successful!');
    } catch (error) {
        console.error('Error registering user:', error);
        res.send('An error occurred');
    }
});

// Route to fetch user profile data by username (with session)
app.get('/profile', async (req, res) => {
    // Check if the user is logged in by checking the session
    if (req.session.username) {
        const username = req.session.username;

        try {
            // Query the database to get user profile info
            const result = await pool.query(
                'SELECT username, full_name, email, last_name, sub_section, profile_pic FROM students WHERE username = $1',
                [username]
            );

            if (result.rows.length > 0) {
                const user = result.rows[0];
                res.json(user);  // Send user data back as JSON
            } else {
                res.status(404).send('User not found');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).send('An error occurred while fetching the profile');
        }
    } else {
        // If the user is not logged in
        res.status(401).send('User not authenticated');
    }
});

// Route to handle logout (destroy session)
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Failed to log out');
        }
        res.send('Logged out successfully');
    });
});

// Route to get attendance data for a user, with attendance per subject
app.get('/attendance', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Unauthorized: No username in session');
    }

    const { username } = req.session;  // Get the username from session

    try {
        // Query to fetch attendance data from the database for all subjects
        const result = await pool.query(`
            SELECT 
                cn_present_class, cn_absent_class, cn_total_class,
                db_present_class, db_absent_class, db_total_class,
                os_present_class, os_absent_class, os_total_class,
                ai_present_class, ai_absent_class, ai_total_class,
                cp_present_class, cp_absent_class, cp_total_class
            FROM students
            WHERE username = $1
        `, [username]);

        if (result.rows.length > 0) {
            const data = result.rows[0];
            res.json(data);  // Send the attendance data back as JSON
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).send('An error occurred while fetching the attendance data');
    }
});
// Route to handle marking attendance (present or absent)
app.post('/mark-attendance', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Unauthorized: No username in session');
    }

    const { username } = req.session;
    const { subject, status } = req.body;  // Get subject and status (present/absent)

    try {
        let columnPrefix;
        if (subject === 'Computer Networks') columnPrefix = 'cn';
        else if (subject === 'Database Management Systems') columnPrefix = 'dp';
        else if (subject === 'Operating System') columnPrefix = 'os';
        else if (subject === 'Artificial Intelligence & Soft Computing') columnPrefix = 'ai';
        else if (subject === 'Competitive Programming') columnPrefix = 'cp';

        if (!columnPrefix) {
            return res.status(400).send('Invalid subject');
        }

        // Update attendance based on the status (present/absent)
        const presentColumn = `${columnPrefix}_present_class`;
        const absentColumn = `${columnPrefix}_absent_class`;
        const totalColumn = `${columnPrefix}_total_class`;

        const query = `
            UPDATE students
            SET 
                ${status === 'present' ? presentColumn : absentColumn} = ${status === 'present' ? presentColumn : absentColumn} + 1,
                ${totalColumn} = ${totalColumn} + 1
            WHERE username = $1
        `;
        
        await pool.query(query, [username]);
        
        res.json({ message: `Attendance for ${subject} marked as ${status}` });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).send('An error occurred while marking attendance');
    }
});
app.get('/get-username', (req, res) => {
    // Check if the user is authenticated and if their username exists in session
    if (req.session && req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: 'User not logged in' });
    }
});
app.post('/update-attendance', async (req, res) => {
    const { username, subject, status } = req.body;

    try {
        // Map subject to the correct column name in the database
        const subjectMap = {
            cn: 'cn',
            db: 'db',
            os: 'os',
            ai: 'ai',
            cp: 'cp'
        };

        const subjectColumn = subjectMap[subject];

        // Update attendance (increment present or absent count)
        if (status === 'present') {
            await pool.query(`
                UPDATE students SET ${subjectColumn}_present_class = ${subjectColumn}_present_class + 1
                WHERE username = $1
            `, [username]);
        } else if (status === 'absent') {
            await pool.query(`
                UPDATE students SET ${subjectColumn}_absent_class = ${subjectColumn}_absent_class + 1
                WHERE username = $1
            `, [username]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.json({ success: false });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
