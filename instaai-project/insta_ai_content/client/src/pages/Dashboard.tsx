import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Instagram,
  Plus,
  Trash2,
  Image,
  Send,
  CheckCircle,
  Loader2,
  ExternalLink,
  LinkIcon,
  UnlinkIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Slide = {
  slideNumber: number;
  heading: string | null;
  content: string | null;
  colorScheme: string | null;
  imageUrl: string | null;
};

type Post = {
  id: number;
  title: string;
  status: string;
  niche: string | null;
  createdAt: Date;
  slides?: Slide[];
};

function parseColors(colorScheme: string | null) {
  const cs = colorScheme || "";
  const primary = cs.match(/primary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || "#6366f1";
  const secondary = cs.match(/secondary:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || "#818cf8";
  const text = cs.match(/text:\s*(#[0-9a-fA-F]{3,6})/)?.[1] || "#ffffff";
  return { primary, secondary, text };
}

function MiniSlide({ slide, total }: { slide: Slide; total: number }) {
  const colors = parseColors(slide.colorScheme);
  if (slide.imageUrl) {
    return (
      <div className="aspect-square rounded-lg overflow-hidden">
        <img src={slide.imageUrl} alt={slide.heading || ""} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="aspect-square rounded-lg flex flex-col items-center justify-center p-3 text-center"
      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
    >
      <p className="text-xs font-bold leading-tight line-clamp-3" style={{ color: colors.text }}>
        {slide.heading}
      </p>
    </div>
  );
}

function PostCard({
  post,
  accounts,
  onDelete,
  onGenerateImages,
  onPublish,
}: {
  post: Post;
  accounts: { id: number; username: string }[];
  onDelete: (id: number) => void;
  onGenerateImages: (postId: number) => void;
  onPublish: (postId: number, accountId: number) => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(accounts[0]?.id || null);

  const postWithSlides = trpc.carousel.get.useQuery(
    { id: post.id },
    { enabled: true }
  );

  const slides = postWithSlides.data?.slides || [];
  const hasImages = slides.some((s) => s.imageUrl);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{post.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {post.niche && (
                <Badge variant="secondary" className="text-xs">{post.niche}</Badge>
              )}
              <Badge
                variant={post.status === "published" ? "default" : "outline"}
                className={`text-xs ${post.status === "published" ? "bg-green-500" : ""}`}
              >
                {post.status}
              </Badge>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(post.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Slides grid */}
        {slides.length > 0 && (
          <div className="mb-3">
            <div className="relative">
              <MiniSlide slide={slides[currentSlide]} total={slides.length} />
              {slides.length > 1 && (
                <div className="flex justify-between mt-1">
                  <button
                    onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                    disabled={currentSlide === 0}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {currentSlide + 1}/{slides.length}
                  </span>
                  <button
                    onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
                    disabled={currentSlide === slides.length - 1}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent disabled:opacity-30"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {post.status !== "published" && (
          <div className="space-y-2">
            {!hasImages && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => onGenerateImages(post.id)}
              >
                <Image className="h-3 w-3 mr-1" />
                Generate slide images
              </Button>
            )}

            {hasImages && accounts.length > 0 && (
              <div className="space-y-2">
                {accounts.length > 1 && (
                  <select
                    className="w-full text-xs border rounded px-2 py-1"
                    value={selectedAccount || ""}
                    onChange={(e) => setSelectedAccount(Number(e.target.value))}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>@{a.username}</option>
                    ))}
                  </select>
                )}
                <Button
                  size="sm"
                  className="w-full text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={() => selectedAccount && onPublish(post.id, selectedAccount)}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Publish to @{accounts.find((a) => a.id === selectedAccount)?.username}
                </Button>
              </div>
            )}

            {hasImages && accounts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Connect Instagram to publish
              </p>
            )}
          </div>
        )}

        {post.status === "published" && (
          <div className="flex items-center gap-1 text-green-600 text-xs">
            <CheckCircle className="h-3 w-3" />
            Published to Instagram
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Handle Instagram OAuth callback
  const [connectingIG, setConnectingIG] = useState(false);
  const connectMutation = trpc.instagram.connect.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected @${data.username}!`);
      utils.instagram.getAccounts.invalidate();
      // Remove code from URL
      window.history.replaceState({}, "", "/dashboard");
    },
    onError: (err) => {
      toast.error("Failed to connect Instagram: " + err.message);
      window.history.replaceState({}, "", "/dashboard");
    },
    onSettled: () => setConnectingIG(false),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("instagram_code");
    const error = params.get("instagram_error");
    if (code) {
      setConnectingIG(true);
      connectMutation.mutate({ code });
    } else if (error) {
      toast.error("Instagram connection failed: " + error);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  const postsQuery = trpc.carousel.list.useQuery();
  const accountsQuery = trpc.instagram.getAccounts.useQuery();
  const igAuthUrlQuery = trpc.instagram.getAuthUrl.useQuery(undefined, { enabled: !!user });

  const generateImagesMutation = trpc.carousel.generateImages.useMutation({
    onSuccess: () => {
      toast.success("Images generated!");
      utils.carousel.list.invalidate();
      utils.carousel.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const publishMutation = trpc.instagram.publish.useMutation({
    onSuccess: () => {
      toast.success("Published to Instagram!");
      utils.carousel.list.invalidate();
    },
    onError: (err) => toast.error("Publish failed: " + err.message),
  });

  const deleteMutation = trpc.carousel.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      utils.carousel.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectMutation = trpc.instagram.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Instagram disconnected");
      utils.instagram.getAccounts.invalidate();
    },
  });

  const posts = postsQuery.data || [];
  const accounts = accountsQuery.data || [];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, {user?.name}</p>
          </div>
          <Button
            onClick={() => setLocation("/")}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New carousel
          </Button>
        </div>

        {connectingIG && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              <span className="text-sm">Connecting Instagram account...</span>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="carousels">
          <TabsList>
            <TabsTrigger value="carousels">My Carousels ({posts.length})</TabsTrigger>
            <TabsTrigger value="instagram">Instagram ({accounts.length})</TabsTrigger>
          </TabsList>

          {/* Carousels tab */}
          <TabsContent value="carousels" className="mt-4">
            {postsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : posts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-12 text-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <Instagram className="h-8 w-8 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold">No carousels yet</p>
                    <p className="text-sm text-muted-foreground">Generate your first carousel to get started</p>
                  </div>
                  <Button onClick={() => setLocation("/")} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create carousel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post as Post}
                    accounts={accounts}
                    onDelete={(id) => deleteMutation.mutate({ id })}
                    onGenerateImages={(postId) => generateImagesMutation.mutate({ postId })}
                    onPublish={(postId, accountId) => publishMutation.mutate({ postId, accountId })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Instagram tab */}
          <TabsContent value="instagram" className="mt-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    Connect Instagram Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your Instagram Business or Creator account to publish carousels directly.
                    You need a Facebook App with Instagram Graph API permissions.
                  </p>
                  <Button
                    onClick={() => {
                      if (igAuthUrlQuery.data) {
                        window.location.href = igAuthUrlQuery.data;
                      }
                    }}
                    disabled={!igAuthUrlQuery.data}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Instagram
                  </Button>
                </CardContent>
              </Card>

              {accounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Connected Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                            {account.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">@{account.username}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Connected
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => disconnectMutation.mutate({ accountId: account.id })}
                        >
                          <UnlinkIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
