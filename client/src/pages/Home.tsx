import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Instagram, Sparkles, ChevronLeft, ChevronRight, LogIn } from "lucide-react";
import { NICHES, TONES, LANGUAGES, APP_NAME } from "@/const";

type Slide = {
  slideNumber: number;
  heading: string;
  content: string;
  colorScheme: string;
};

type GeneratedCarousel = {
  postId: number | null;
  title: string;
  caption: string;
  slides: Slide[];
};

function parseColors(colorScheme: string) {
  const primary = colorScheme?.match(/primary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || "#6366f1";
  const text = colorScheme?.match(/text:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || "#ffffff";
  const secondary = colorScheme?.match(/secondary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || "#818cf8";
  return { primary, secondary, text };
}

function SlidePreview({ slide, total }: { slide: Slide; total: number }) {
  const colors = parseColors(slide.colorScheme);
  return (
    <div
      className="relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-2xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-40 h-40 rounded-full opacity-10" style={{ background: colors.text, transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: colors.text, transform: "translate(30%, 30%)" }} />

      {/* Slide number */}
      <div className="absolute top-4 left-4">
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${colors.text}30`, color: colors.text }}>
          {slide.slideNumber}/{total}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-4 max-w-xs">
        <h2 className="text-2xl font-black leading-tight" style={{ color: colors.text }}>
          {slide.heading}
        </h2>
        <div className="w-16 h-1 rounded mx-auto" style={{ background: `${colors.text}60` }} />
        <p className="text-sm leading-relaxed opacity-90" style={{ color: colors.text }}>
          {slide.content}
        </p>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === slide.slideNumber - 1 ? 16 : 6,
              height: 6,
              background: colors.text,
              opacity: i === slide.slideNumber - 1 ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [niche, setNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [tone, setTone] = useState("Professional");
  const [language, setLanguage] = useState("English");
  const [targetAudience, setTargetAudience] = useState("");

  const [carousel, setCarousel] = useState<GeneratedCarousel | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const generateMutation = trpc.carousel.generate.useMutation({
    onSuccess: (data) => {
      setCarousel(data as GeneratedCarousel);
      setCurrentSlide(0);
      toast.success("Carousel generated!");
    },
    onError: (err) => {
      toast.error(err.message || "Generation failed. Please try again.");
    },
  });

  const handleGenerate = () => {
    const finalNiche = niche === "__custom__" ? customNiche : niche;
    if (!finalNiche.trim()) {
      toast.error("Please select or enter a niche");
      return;
    }
    if (!targetAudience.trim()) {
      toast.error("Please describe your target audience");
      return;
    }
    generateMutation.mutate({ niche: finalNiche, tone, language, targetAudience });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {APP_NAME}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button onClick={() => setLocation("/dashboard")} variant="outline" size="sm">
                Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => setLocation("/login")} variant="ghost" size="sm">
                  Sign in
                </Button>
                <Button
                  onClick={() => setLocation("/register")}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Instagram Carousels
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Create stunning carousels
            <br />in 30 seconds
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate professional Instagram carousel posts with AI. No design skills needed.
            {!user && " Try it free — no account required."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Configure your carousel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Niche */}
              <div className="space-y-2">
                <Label>Niche / Topic</Label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a niche..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHES.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {niche === "__custom__" && (
                  <Input
                    placeholder="Enter your niche or topic..."
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                  />
                )}
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label>Tone of voice</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label>Target audience</Label>
                <Input
                  placeholder="e.g. Entrepreneurs aged 25-40 interested in growth..."
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full h-12 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Generating carousel...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate carousel
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  <button onClick={() => setLocation("/register")} className="text-purple-600 hover:underline">
                    Create an account
                  </button>{" "}
                  to save carousels and publish to Instagram
                </p>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="space-y-4">
            {carousel ? (
              <>
                {/* Slide navigation */}
                <div className="relative">
                  <SlidePreview
                    slide={carousel.slides[currentSlide]}
                    total={carousel.slides.length}
                  />
                  {/* Nav buttons */}
                  <button
                    onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                    disabled={currentSlide === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((s) => Math.min(carousel.slides.length - 1, s + 1))}
                    disabled={currentSlide === carousel.slides.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 hover:bg-white transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Caption */}
                <Card className="border-0 shadow-md bg-white/90">
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Caption
                    </p>
                    <p className="text-sm whitespace-pre-wrap line-clamp-4">{carousel.caption}</p>
                  </CardContent>
                </Card>

                {/* CTA if not logged in */}
                {!user && (
                  <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 border">
                    <CardContent className="pt-4 text-center">
                      <p className="font-semibold mb-1">Want to publish this to Instagram?</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create a free account to save, generate images and publish directly.
                      </p>
                      <Button
                        onClick={() => setLocation("/register")}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <Instagram className="h-4 w-4 mr-2" />
                        Connect Instagram & Publish
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {user && carousel.postId && (
                  <Button
                    onClick={() => setLocation("/dashboard")}
                    variant="outline"
                    className="w-full"
                  >
                    View in Dashboard & Publish →
                  </Button>
                )}
              </>
            ) : (
              <div className="aspect-square rounded-2xl border-2 border-dashed border-purple-200 bg-white/50 flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <Instagram className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Your carousel preview</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Fill in the form and click "Generate carousel"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
