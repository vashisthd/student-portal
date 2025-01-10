const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Set up PostgreSQL connection pool
const pool = new Pool({
    user: 'postgres',    // Database username (since you are using 'postgres')
    host: 'localhost',   // Database host (localhost for local development)
    database: 'student_portal', // Your database name
    password: 'Deepak@2113', // Your password for the 'postgres' user
    port: 5432,          // PostgreSQL default port
});

// Function to update passwords
async function updatePasswords() {
    const result = await pool.query('SELECT username, password FROM students');
    const users = result.rows;

    for (let user of users) {
        const { username, password } = user;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the password in the database
        await pool.query(
            'UPDATE students SET password = $1 WHERE username = $2',
            [hashedPassword, username]
        );

        console.log(`Password for user ${username} updated.`);
    }

    console.log('All passwords updated!');
    pool.end();
}

// Run the function to update passwords
updatePasswords().catch(err => {
    console.error('Error updating passwords:', err);
    pool.end();
});
