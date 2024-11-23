// Initialize WebSocket connection
const socket = io(); // Assumes the frontend is served from the same origin as the WebSocket server

// Handle Login Form Submission
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

        // Register user with WebSocket for real-time updates
        socket.emit('registerUser', result.user.id);
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

// Listen for real-time updates to the user's queue
socket.on('userQueueUpdated', (data) => {
  console.log('User queue update received:', data); // Debug: Log the received data
  alert(`Your queue status has been updated: ${JSON.stringify(data)}`);
});

// Listen for global queue updates
socket.on('queueUpdated', () => {
  console.log('Queue update received. Refreshing queue data...'); // Debug
  refreshQueueDisplay();
});

// Fetch and update the queue display dynamically
async function refreshQueueDisplay() {
  try {
    // Fetch the latest queue data from the backend
    const response = await fetch('/api/users/queue');
    const queueData = await response.json();

    console.log('Latest queue data:', queueData); // Debug: Log the fetched data

    // Update the queue display on the page
    const queueContainer = document.getElementById('queueContainer');
    queueContainer.innerHTML = ''; // Clear existing content

    // Dynamically populate the queue data
    queueData.forEach((queueItem) => {
      const queueElement = document.createElement('div');
      queueElement.classList.add('queue-item');
      queueElement.textContent = `Queue #${queueItem.queue_number} - ${queueItem.first_name} ${queueItem.last_name}`;
      queueContainer.appendChild(queueElement);
    });
  } catch (error) {
    console.error('Error fetching queue data:', error); // Debug: Log any errors
    alert('Failed to refresh the queue. Please try again later.');
  }
}
