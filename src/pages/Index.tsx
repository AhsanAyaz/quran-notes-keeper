import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import Auth from "@/components/Auth";
import { BookOpen } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/dashboard");
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">
          <BookOpen className="h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sand-50 to-sand-100">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <div className="inline-block bg-primary/10 p-3 rounded-full mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">
            Quran Notes
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Record your voice notes as you read the Quran, organized by chapter
            and verse.
          </p>
        </div>

        <div className="w-full max-w-md">
          <Auth />
        </div>

        <div className="mt-16 text-center text-muted-foreground text-sm">
          <p>Use your voice to easily record reflections while reading</p>
          <p>Organize notes by chapter and verse for easy reference</p>
          <p>Create multiple reading passes to track your progress</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
