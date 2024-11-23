// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault(); // Prevent the default form submission

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  console.log('Data sent to backend:', { email, password }); // Debug: Log the submitted data

  try {
    const response = await fetch('/api/auth/login', {
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

// WebSocket integration for live updates
let socket;

// Function to initialize WebSocket
function initializeSocket() {
  socket = io(); // Connect to the WebSocket server

  // Listen for queue updates
  socket.on('queueUpdated', () => {
    console.log('Queue updated. Refreshing relevant UI...');
    refreshQueueUI(); // Custom function to refresh queue-related UI
  });

  // Optional: Additional socket event handlers can be added here
}

// Function to refresh queue-related UI
function refreshQueueUI() {
  if (typeof loadQueue === 'function') {
    console.log('Refreshing admin live queue...');
    loadQueue(); // Refresh live queue for admin
  }
  if (typeof loadUserQueueStatus === 'function') {
    console.log('Refreshing user-specific queue status...');
    loadUserQueueStatus(); // Refresh user-specific queue status
  }
  if (typeof loadLiveQueue === 'function') {
    console.log('Refreshing full live queue display...');
    loadLiveQueue(); // Refresh full live queue display
  }
}

// Common error handling function
function handleError(error, context = 'Operation') {
  console.error(`${context} failed:`, error);
  alert('An error occurred. Please try again.');
}

// Initialize WebSocket and relevant functionality on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeSocket();
});
