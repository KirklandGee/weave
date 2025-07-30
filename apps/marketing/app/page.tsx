export default function Home() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden tapestry-texture">
      {/* Tapestry background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(212,175,55,0.08),transparent_50%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,215,0,0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23d4af37%22%20fill-opacity=%220.02%22%3E%3Cpath%20d=%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-10" />
      <div className="absolute inset-0 mystical-glow opacity-30" />
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center ornate-border">
          <div className="mb-8 filigree-corners">
            <h1 className="text-8xl font-bold decorative-title mb-4">
              AI RPG Manager
            </h1>
            <div className="ornate-divider" />
          </div>
          
          <p className="text-2xl text-amber-200 mb-16 max-w-xl mx-auto leading-relaxed font-medium">
            Forge legendary campaigns with enchanted tools
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-24">
            <a
              href="http://app.localhost:3001"
              className="group tapestry-panel text-amber-100 font-semibold py-6 px-12 text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-amber-500"
            >
              <span className="flex items-center justify-center gap-3 decorative-title">
                Enter the Realm
                <svg className="w-6 h-6 transition-transform group-hover:translate-x-1 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
          </div>
        </div>

        <div id="features" className="grid md:grid-cols-3 gap-12 mb-32">
          <div className="group tapestry-panel p-10 transition-all duration-500 hover:shadow-2xl hover:scale-105 filigree-corners">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center mb-8 group-hover:from-amber-500 group-hover:to-amber-700 transition-all shadow-lg">
              <svg className="w-8 h-8 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-amber-200 mb-6 decorative-title">
              Chronicle Keeper
            </h3>
            <p className="text-amber-100 leading-relaxed text-lg">
              Weave tales with intelligent scribing
            </p>
          </div>
          
          <div className="group tapestry-panel p-10 transition-all duration-500 hover:shadow-2xl hover:scale-105 filigree-corners">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center mb-8 group-hover:from-amber-500 group-hover:to-amber-700 transition-all shadow-lg">
              <svg className="w-8 h-8 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-amber-200 mb-6 decorative-title">
              Character Forge
            </h3>
            <p className="text-amber-100 leading-relaxed text-lg">
              Craft legendary heroes and villains
            </p>
          </div>
          
          <div className="group tapestry-panel p-10 transition-all duration-500 hover:shadow-2xl hover:scale-105 filigree-corners">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center mb-8 group-hover:from-amber-500 group-hover:to-amber-700 transition-all shadow-lg">
              <svg className="w-8 h-8 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-amber-200 mb-6 decorative-title">
              Oracle's Wisdom
            </h3>
            <p className="text-amber-100 leading-relaxed text-lg">
              Harness AI magic for epic storytelling
            </p>
          </div>
        </div>

        <div className="text-center relative ornate-border">
          <div className="ornate-divider mb-12" />
          <div className="filigree-corners">
            <h2 className="text-5xl font-bold decorative-title mb-8">
              Begin Your Quest
            </h2>
            <p className="text-xl text-amber-200 mb-12 max-w-lg mx-auto font-medium">
              Join the fellowship of legendary storytellers
            </p>
            <a
              href="http://app.localhost:3001"
              className="inline-block tapestry-panel text-amber-100 font-bold py-6 px-16 text-xl transition-all duration-300 transform hover:scale-110 hover:shadow-2xl border-2 border-amber-400 decorative-title"
            >
              Embark Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
