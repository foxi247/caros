import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4">
      <div className="text-8xl font-black text-muted-foreground/30">404</div>
      <div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
      <Button onClick={() => setLocation("/")} className="gap-2">
        <Home className="h-4 w-4" />
        Go Home
      </Button>
    </div>
  );
}
