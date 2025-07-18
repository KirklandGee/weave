export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.03),transparent_50%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.01),transparent_50%)]" />
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-300 bg-clip-text text-transparent mb-2">
              AI RPG Manager
            </h1>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent mx-auto" />
          </div>
          
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Transform your tabletop RPG campaigns with intelligent note-taking, character management, and AI-powered storytelling assistance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <a
              href="http://app.localhost:3001"
              className="group bg-zinc-100 hover:bg-white text-zinc-900 font-medium py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                Launch App
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
            <a
              href="#features"
              className="group bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium py-4 px-8 rounded-lg text-lg border border-zinc-700 hover:border-zinc-600 transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>

        <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="group bg-zinc-900/50 backdrop-blur-sm p-8 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:bg-zinc-900/70">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors">
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">
              Smart Note-Taking
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Organize your campaign notes with intelligent tagging and cross-referencing. Never lose track of important story details again.
            </p>
          </div>
          
          <div className="group bg-zinc-900/50 backdrop-blur-sm p-8 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:bg-zinc-900/70">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors">
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">
              Character Management
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Keep detailed records of NPCs, their relationships, and story arcs. Build rich, interconnected worlds with ease.
            </p>
          </div>
          
          <div className="group bg-zinc-900/50 backdrop-blur-sm p-8 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:bg-zinc-900/70">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-zinc-700 transition-colors">
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-4">
              AI-Powered Insights
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Get intelligent suggestions for story development, character motivations, and plot connections based on your campaign data.
            </p>
          </div>
        </div>

        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent h-px top-0" />
          <div className="pt-16">
            <h2 className="text-4xl font-bold text-zinc-100 mb-6">
              Ready to enhance your campaigns?
            </h2>
            <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
              Join DMs who are already using AI RPG Manager to create more engaging stories.
            </p>
            <a
              href="http://app.localhost:3001"
              className="inline-block bg-zinc-100 hover:bg-white text-zinc-900 font-medium py-4 px-10 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              Get Started Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
