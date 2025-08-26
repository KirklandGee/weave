import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, MessageCircle, Link2 } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 1200 800" fill="none">
          <defs>
            <linearGradient id="thread" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4af37" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d4af37" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d="M0,400 Q300,200 600,400 T1200,400"
            stroke="url(#thread)"
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
          />
          <path
            d="M0,300 Q400,100 800,300 T1200,300"
            stroke="url(#thread)"
            strokeWidth="1.5"
            fill="none"
            className="animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <path
            d="M0,500 Q200,300 400,500 T800,500 Q1000,300 1200,500"
            stroke="url(#thread)"
            strokeWidth="1"
            fill="none"
            className="animate-pulse"
            style={{ animationDelay: "2s" }}
          />
        </svg>
      </div>

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 relative">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/weave-logo.png" alt="Weave Logo" width={32} height={32} className="w-8 h-8" />
            <span className="text-xl font-semibold">Weave</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a
              href="https://use-weave.app/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
          </nav>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <a href="https://use-weave.app">Get Started</a>
          </Button>
        </div>
      </header>

      <section className="py-32 px-4 relative">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <Image src="/weave-logo.png" alt="Weave Logo" width={120} height={120} className="w-30 h-30 mx-auto mb-8" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Weave Your Campaign Stories Together
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            The relationship-first TTRPG campaign manager with AI that understands your world&apos;s connections. Chat with
            an assistant that remembers every character, location, and plot thread you&apos;ve woven together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8" asChild>
              <a href="https://use-weave.app">Start Weaving</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent" asChild>
              <a href="https://use-weave.app/pricing">View Pricing</a>
            </Button>
          </div>

          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border border-primary/20 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground mb-2">Start with our free plan</p>
            <p className="text-primary font-medium">
              Experience the core note-taking features, then upgrade for AI assistance
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Built for Connected Storytelling</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to help you weave richer, more connected campaigns.
            </p>
          </div>

          <div className="space-y-20">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">Chat-Based AI</Badge>
                </div>
                <h3 className="text-3xl font-bold mb-4">Conversation-Driven Campaign Management</h3>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Simply chat with your AI assistant about your campaign. Ask questions, brainstorm ideas, or get
                  suggestions - all while maintaining perfect context of your world&apos;s relationships.
                </p>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-card/50 rounded-lg p-6 border border-border">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">You</span>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3 flex-1">
                        <p className="text-sm">What should happen when the players return to Shadowfell?</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">AI</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 flex-1">
                        <p className="text-sm">
                          Since they left the Crypt Puzzle Key behind, Haggra Hexeye might have discovered it. This
                          could tie into the Shadowfell Leakage Report they found earlier...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-primary" />
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">Relationship Mapping</Badge>
                </div>
                <h3 className="text-3xl font-bold mb-4">Manual Relationship Control</h3>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Create precise connections between characters, locations, and events. Define relationships like
                  &quot;OCCURS IN&quot;, &quot;MENTIONS&quot;, or &quot;LIVES IN&quot; to build a web of interconnected campaign knowledge.
                </p>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-card/50 rounded-lg p-6 border border-border">
                  <h4 className="font-semibold mb-4 text-primary">Relationships Panel</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        KNOWS
                      </Badge>
                      <span className="text-sm">← Elara Brightblade (NPC)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                        LIVES IN
                      </Badge>
                      <span className="text-sm">← Moonhaven Village (Location)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        PART OF
                      </Badge>
                      <span className="text-sm">← Session 3: The Gathering Storm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">Markdown Native</Badge>
                </div>
                <h3 className="text-3xl font-bold mb-4">Write Naturally, Stay Portable</h3>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Pure markdown means your campaign notes are always yours. No vendor lock-in, easy version control, and
                  the writing experience you already love.
                </p>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-card/50 rounded-lg p-6 border border-border font-mono text-sm">
                  <div className="text-primary mb-2 font-semibold text-lg"># Haunted Crypts of Shadowfell</div>
                  <div className="text-muted-foreground mb-4 text-sm">*POI • Last updated 8/19/2025 • 8 words*</div>
                  <div className="mb-4 text-base">Ancient tombs where shadows cling to the living.</div>
                  <div className="text-primary font-semibold mb-2">## Connected Elements</div>
                  <div className="text-muted-foreground text-sm">- [[Session 2]] - First discovery</div>
                  <div className="text-muted-foreground text-sm">- [[Crypt Puzzle Key]] - Hidden artifact</div>
                  <div className="text-muted-foreground text-sm">- [[Haggra Hexeye]] - Guardian spirit</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Weave Your Stories?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start with our free plan and discover how relationship-first campaign management transforms your
            storytelling.
          </p>
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8" asChild>
            <a href="https://use-weave.app">Begin Your Campaign</a>
          </Button>
        </div>
      </section>
    </div>
  )
}
