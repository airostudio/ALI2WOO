// Content script that runs on AliExpress product pages

(function () {
  'use strict';

  // Check if we're on a product page
  if (!window.location.pathname.includes('/item/')) {
    return;
  }

  // Extract product data from page
  function extractProductData() {
    try {
      // Try to get data from window object (AliExpress stores product data there)
      const productData = window.runParams?.data || {};

      // Fallback to scraping if window data not available
      const title =
        productData.titleModule?.subject ||
        document.querySelector('h1')?.textContent?.trim() ||
        '';

      const priceElement = document.querySelector('.product-price-value');
      const price = priceElement?.textContent?.trim() || '';

      // Extract images
      const images = [];
      const imageElements = document.querySelectorAll(
        '.images-view-list img, .images-view-item img'
      );
      imageElements.forEach((img) => {
        const src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src && !images.includes(src)) {
          images.push(src.replace(/_\d+x\d+\./, '_800x800.'));
        }
      });

      // Get main image
      const mainImage =
        document.querySelector('.magnifier-image img')?.getAttribute('src') ||
        images[0] ||
        '';

      // Extract product ID from URL
      const productIdMatch = window.location.pathname.match(/\/(\d+)\.html/);
      const productId = productIdMatch ? productIdMatch[1] : '';

      // Get description
      const description =
        productData.descriptionModule?.descriptionUrl ||
        document
          .querySelector('.product-description')
          ?.textContent?.trim() ||
        '';

      // Get rating and reviews
      const rating =
        productData.titleModule?.feedbackRating?.averageStar ||
        document
          .querySelector('.overview-rating-average')
          ?.textContent?.trim() ||
        '0';

      const reviewCount =
        productData.titleModule?.feedbackRating?.totalValidNum ||
        document.querySelector('.product-reviewer-reviews')?.textContent || '0';

      // Get store info
      const storeName =
        productData.storeModule?.storeName ||
        document.querySelector('.store-name')?.textContent?.trim() ||
        '';

      const storeUrl =
        productData.storeModule?.storeURL ||
        document.querySelector('.store-header-link')?.getAttribute('href') ||
        '';

      return {
        productId,
        title,
        price,
        mainImage,
        images,
        description,
        rating: parseFloat(rating),
        reviewCount: parseInt(reviewCount.replace(/[^\d]/g, '')) || 0,
        storeName,
        storeUrl,
        url: window.location.href,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error extracting product data:', error);
      return null;
    }
  }

  // Create import button
  function createImportButton() {
    const button = document.createElement('button');
    button.id = 'ali2woo-import-btn';
    button.className = 'ali2woo-import-button';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Import to Store</span>
    `;

    button.addEventListener('click', handleImportClick);

    return button;
  }

  // Handle import button click
  async function handleImportClick(e) {
    e.preventDefault();
    const button = e.currentTarget;

    // Disable button
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Importing...';

    try {
      // Extract product data
      const productData = extractProductData();

      if (!productData || !productData.productId) {
        throw new Error('Failed to extract product data');
      }

      // Get API URL and auth token from storage
      const { apiUrl, authToken } = await chrome.storage.sync.get([
        'apiUrl',
        'authToken',
      ]);

      if (!apiUrl || !authToken) {
        throw new Error('Please configure API settings in the extension popup');
      }

      // Send to background script for processing
      const response = await chrome.runtime.sendMessage({
        action: 'importProduct',
        data: productData,
        apiUrl,
        authToken,
      });

      if (response.success) {
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Imported!</span>
        `;
        button.style.backgroundColor = '#10b981';

        // Show success notification
        showNotification('Product imported successfully!', 'success');

        // Reset button after 3 seconds
        setTimeout(() => {
          button.disabled = false;
          button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Import to Store</span>
          `;
          button.style.backgroundColor = '#3b82f6';
        }, 3000);
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      button.disabled = false;
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>Import Failed</span>
      `;
      button.style.backgroundColor = '#ef4444';

      showNotification(error.message, 'error');

      // Reset button after 3 seconds
      setTimeout(() => {
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Import to Store</span>
        `;
        button.style.backgroundColor = '#3b82f6';
      }, 3000);
    }
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `ali2woo-notification ali2woo-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  // Insert button into page
  function insertButton() {
    // Try multiple locations to insert the button
    const targetSelectors = [
      '.product-action',
      '.product-info',
      '.product-title-wrapper',
      '.product-main',
    ];

    for (const selector of targetSelectors) {
      const target = document.querySelector(selector);
      if (target) {
        const button = createImportButton();
        target.insertBefore(button, target.firstChild);
        return;
      }
    }

    // Fallback: create floating button
    const button = createImportButton();
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '10000';
    document.body.appendChild(button);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertButton);
  } else {
    insertButton();
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getProductData') {
      const data = extractProductData();
      sendResponse({ success: true, data });
    }
    return true;
  });
})();
