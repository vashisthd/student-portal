// public/script.js

// Handle Login Form Submission
document.getElementById('login-form')?.addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.text())
    .then(data => {
        if (data === 'Login successful!') {
            alert('Login successful!');
            window.location.href = 'profile.html'; // Redirect to profile page
        } else {
            alert('Invalid credentials');
        }
    })
    .catch(error => console.error('Error:', error));
});
