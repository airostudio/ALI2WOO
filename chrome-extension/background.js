// Background service worker

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'importProduct') {
    importProduct(request.data, request.apiUrl, request.authToken)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({ success: false, error: error.message })
      );
    return true; // Will respond asynchronously
  }
});

async function importProduct(productData, apiUrl, authToken) {
  try {
    // Step 1: Rewrite title for SEO using AI
    const optimizedTitle = await rewriteTitleForSEO(
      productData.title,
      apiUrl,
      authToken
    );

    // Step 2: Send product data to API
    const response = await fetch(`${apiUrl}/api/products/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        ...productData,
        optimizedTitle,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Import failed');
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function rewriteTitleForSEO(title, apiUrl, authToken) {
  try {
    const response = await fetch(`${apiUrl}/api/ai/optimize-title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      console.error('Failed to optimize title, using original');
      return title;
    }

    const result = await response.json();
    return result.optimizedTitle || title;
  } catch (error) {
    console.error('Title optimization error:', error);
    return title; // Fallback to original title
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Check if we're on an AliExpress page
  if (
    tab.url.includes('aliexpress.com') ||
    tab.url.includes('aliexpress.us')
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  }
});
