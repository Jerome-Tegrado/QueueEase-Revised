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
        localStorage.setItem('id', result.user.id); // Ensure the key matches the one used in notifications
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
  const notificationsContainer = document.getElementById('notificationsContainer');

  // Prepend the new notification to the top of the list
  const notificationCard = `
    <div class="notification-card">
      <p>${data.message}</p>
      <span>${new Date().toLocaleString()}</span>
    </div>
  `;
  notificationsContainer.innerHTML = notificationCard + notificationsContainer.innerHTML;

  // Optional: Update a notification badge
  const notificationBadge = document.getElementById('notificationBadge');
  if (notificationBadge) {
    notificationBadge.textContent = parseInt(notificationBadge.textContent || 0) + 1;
  }
  alert(`Your queue status has been updated: ${data.message}`);
});

// Listen for global queue updates
socket.on('queueUpdated', () => {
  console.log('Queue update received. Refreshing queue data...'); // Debug
  refreshQueueDisplay();
});

// Listen for next queue notifications
socket.on('nextQueueNotification', (data) => {
  console.log('Next queue notification received:', data); // Debug
  alert(`You are now in progress: ${data.message}`);
});

// Fetch and update the queue display dynamically
// Fetch and update the queue display dynamically
async function refreshQueueDisplay() {
  try {
    // Fetch the latest queue data from the backend
    const response = await fetch('/api/users/queue');
    const queueData = await response.json();

    console.log('Latest queue data:', queueData); // Debug: Log the fetched data

    // Find the queue container to update the display
    const queueContainer = document.getElementById('queueContainer');

    // Loop through the queue data and update only the changed items
    queueData.forEach((queueItem) => {
      let queueElement = document.querySelector(`#queueItem-${queueItem.queue_number}`);
      
      // If the element doesn't exist, create it
      if (!queueElement) {
        queueElement = document.createElement('div');
        queueElement.id = `queueItem-${queueItem.queue_number}`;  // Set a unique ID
        queueElement.classList.add('queue-item');
        queueContainer.appendChild(queueElement);
      }

      // Update the content of the element
      queueElement.textContent = `Queue #${queueItem.queue_number} - ${queueItem.first_name} ${queueItem.last_name} (${queueItem.status})`;
    });
  } catch (error) {
    console.error('Error fetching queue data:', error); // Debug: Log any errors
    alert('Failed to refresh the queue. Please try again later.');
  }
}


// Fetch and display user notifications
async function loadNotifications() {
  try {
    const userId = localStorage.getItem('id'); // Ensure the key matches the stored user ID
    if (!userId) throw new Error('User not logged in.');

    const response = await fetch(`/api/users/notifications/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch notifications.');

    const notifications = await response.json();
    const notificationsContainer = document.getElementById('notificationsContainer');

    if (notifications.length > 0) {
      notificationsContainer.innerHTML = notifications.map(notification => `
        <div class="notification-card">
          <p>${notification.message}</p>
          <span>${new Date(notification.created_at).toLocaleString()}</span>
        </div>
      `).join('');
    } else {
      notificationsContainer.innerHTML = "<p>No notifications found.</p>";
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
    document.getElementById('notificationsContainer').innerHTML =
      "<p>Error loading notifications. Please try again later.</p>";
  }
}

// Automatically fetch notifications on page load if the container exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('notificationsContainer')) {
    loadNotifications();

    // Register the user for WebSocket real-time updates
    const userId = localStorage.getItem('id');
    if (userId) {
      socket.emit('registerUser', userId);
    }
  }
});
