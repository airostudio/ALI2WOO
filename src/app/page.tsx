import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-16">
          <h1 className="text-6xl font-bold mb-4">
            ALI2WOO
          </h1>
          <p className="text-2xl mb-8 opacity-90">
            Modern AliExpress Dropshipping Platform
          </p>
          <p className="text-lg max-w-2xl mx-auto opacity-80">
            Import products with AI-powered optimization, intelligent pricing,
            and automated order fulfillment
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold mb-2">One-Click Import</h3>
            <p className="text-gray-600">
              Use our Chrome extension to import products directly from
              AliExpress with AI-optimized titles
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">Smart Pricing</h3>
            <p className="text-gray-600">
              Dynamic pricing engine with configurable margin rules and
              competitor analysis
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold mb-2">Global Shipping</h3>
            <p className="text-gray-600">
              Ship to 200+ countries with accurate shipping cost and tax
              calculations
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">AI Optimization</h3>
            <p className="text-gray-600">
              AI-powered product quality checks, SEO optimization, and smart
              recommendations
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Auto Fulfillment</h3>
            <p className="text-gray-600">
              Automated order placement and tracking synchronization with
              AliExpress
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Analytics</h3>
            <p className="text-gray-600">
              Real-time profit tracking, conversion analytics, and business
              intelligence
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/admin"
            className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Get Started
          </Link>
        </div>

        <div className="mt-16 bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-4xl mx-auto text-white">
          <h2 className="text-2xl font-bold mb-4">
            Chrome Extension Available
          </h2>
          <p className="mb-4">
            Install our Chrome extension to import products with a single click:
          </p>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Open Chrome and go to chrome://extensions/</li>
            <li>Enable "Developer mode"</li>
            <li>Click "Load unpacked"</li>
            <li>Select the chrome-extension folder from this project</li>
            <li>Configure your API URL and auth token</li>
            <li>Browse AliExpress and click "Import to Store"</li>
          </ol>
          <p className="text-sm opacity-80">
            The extension uses AI to automatically rewrite product titles for
            better SEO and AI search visibility.
          </p>
        </div>
      </div>
    </div>
  );
}
