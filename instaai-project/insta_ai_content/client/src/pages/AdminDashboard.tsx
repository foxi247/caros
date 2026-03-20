import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Image, Send } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const postsQuery = trpc.carousel.adminList.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  if (user && user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
        </div>
      </DashboardLayout>
    );
  }

  const posts = postsQuery.data || [];
  const published = posts.filter((p) => p.status === "published").length;
  const generated = posts.filter((p) => p.status === "generated").length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Image className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">Total carousels</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Send className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{published}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{generated}</p>
                  <p className="text-xs text-muted-foreground">Generated (unpublished)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts table */}
        <Card>
          <CardHeader>
            <CardTitle>All Carousel Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {postsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-3 rounded-lg border text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.niche} · {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={post.status === "published" ? "default" : "secondary"}
                      className={post.status === "published" ? "bg-green-500" : ""}
                    >
                      {post.status}
                    </Badge>
                  </div>
                ))}
                {posts.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No posts yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
