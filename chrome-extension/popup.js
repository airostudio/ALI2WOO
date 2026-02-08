// Popup script

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settingsForm');
  const apiUrlInput = document.getElementById('apiUrl');
  const authTokenInput = document.getElementById('authToken');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Load saved settings
  const settings = await chrome.storage.sync.get(['apiUrl', 'authToken']);
  if (settings.apiUrl) {
    apiUrlInput.value = settings.apiUrl;
  }
  if (settings.authToken) {
    authTokenInput.value = settings.authToken;
  }

  // Load stats
  loadStats();

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiUrl = apiUrlInput.value.trim();
    const authToken = authTokenInput.value.trim();

    if (!apiUrl || !authToken) {
      showStatus('Please fill in all fields', 'error');
      return;
    }

    // Validate URL
    try {
      new URL(apiUrl);
    } catch {
      showStatus('Invalid API URL', 'error');
      return;
    }

    // Save settings
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Test connection
      const response = await fetch(`${apiUrl}/api/health`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      // Save to storage
      await chrome.storage.sync.set({ apiUrl, authToken });

      showStatus('Settings saved successfully!', 'success');
      loadStats();
    } catch (error) {
      showStatus(
        'Failed to connect. Please check your settings.',
        'error'
      );
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;

    if (type === 'success') {
      setTimeout(() => {
        status.className = 'status';
      }, 3000);
    }
  }

  async function loadStats() {
    const settings = await chrome.storage.sync.get(['apiUrl', 'authToken']);

    if (!settings.apiUrl || !settings.authToken) {
      return;
    }

    try {
      const response = await fetch(`${settings.apiUrl}/api/products/stats`, {
        headers: {
          Authorization: `Bearer ${settings.authToken}`,
        },
      });

      if (response.ok) {
        const stats = await response.json();
        document.getElementById('productCount').textContent =
          stats.totalProducts || 0;
        document.getElementById('todayCount').textContent =
          stats.todayProducts || 0;
        document.getElementById('stats').style.display = 'grid';
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }
});
