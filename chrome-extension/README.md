# ALI2WOO Chrome Extension

Chrome extension for importing AliExpress products with AI-powered SEO optimization.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `chrome-extension` folder
5. The extension will appear in your Chrome toolbar

## Setup

1. Click the extension icon
2. Enter your store's API URL (e.g., `https://your-store.com`)
3. Enter your authentication token
4. Click "Save Settings"

## Usage

1. Navigate to any AliExpress product page
2. Click the "Import to Store" button that appears
3. The product will be imported with AI-optimized title
4. View imported product in your admin dashboard

## Features

- One-click product import from AliExpress
- Automatic data extraction (title, price, images, rating)
- AI-powered SEO title optimization
- Real-time import status
- Product statistics in popup

## Icon Generation

To generate icons from the SVG:

```bash
# Install ImageMagick (if not already installed)
brew install imagemagick  # macOS
apt-get install imagemagick  # Linux

# Generate icons
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

Or use an online SVG to PNG converter.

## Troubleshooting

### "Failed to connect" error
- Check that your API URL is correct
- Ensure your auth token is valid
- Make sure the API server is running

### Import button not appearing
- Refresh the AliExpress page
- Make sure you're on a product page (URL contains /item/)
- Check browser console for errors

### Products not importing
- Verify API credentials in extension popup
- Check that the product hasn't been imported already
- Ensure your store has sufficient permissions

## Development

The extension consists of:

- `manifest.json` - Extension configuration
- `content.js` - Runs on AliExpress pages
- `content.css` - Styling for import button
- `background.js` - Handles API communication
- `popup.html/js` - Extension settings UI

To modify the extension:

1. Make your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the ALI2WOO extension
4. Test your changes on an AliExpress page
