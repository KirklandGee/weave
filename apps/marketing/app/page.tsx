export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-6">
            AI RPG Manager
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Transform your tabletop RPG campaigns with intelligent note-taking, character management, and AI-powered storytelling assistance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="http://app.localhost:3001"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Launch App
            </a>
            <a
              href="#features"
              className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg text-lg border-2 border-blue-600 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        <div id="features" className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Smart Note-Taking
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Organize your campaign notes with intelligent tagging and cross-referencing. Never lose track of important story details again.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Character Management
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Keep detailed records of NPCs, their relationships, and story arcs. Build rich, interconnected worlds with ease.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              AI-Powered Insights
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get intelligent suggestions for story development, character motivations, and plot connections based on your campaign data.
            </p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to enhance your campaigns?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join DMs who are already using AI RPG Manager to create more engaging stories.
          </p>
          <a
            href="http://app.localhost:3001"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Get Started Now
          </a>
        </div>
      </div>
    </div>
  );
}
