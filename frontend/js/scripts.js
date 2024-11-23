document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault(); // Prevent the default form submission

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  console.log('Data sent to backend:', { email, password }); // Debug: Log the submitted data

  try {
    const response = await fetch('/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    console.log('Response status:', response.status); // Debug: Log response status
    console.log('Server response:', result); // Debug: Log the server response

    if (response.ok) {
      // Check if user details are returned and store in localStorage
      if (result.user && result.user.id && result.user.email) {
        localStorage.setItem('id', result.user.id);
        localStorage.setItem('email', result.user.email);
        console.log('User details saved in localStorage:', {
          id: result.user.id,
          email: result.user.email,
        }); // Debug
      }

      alert(result.message);
      console.log('Redirecting to:', result.redirect); // Debug: Log the redirection URL
      window.location.href = result.redirect; // Redirect to the appropriate dashboard
    } else {
      console.warn('Login failed with message:', result.message); // Debug: Log failure details
      alert(result.message || 'Login failed.');
    }
  } catch (error) {
    console.error('Error during login:', error); // Debug: Log any errors
    alert('An error occurred. Please try again later.');
  }
});
