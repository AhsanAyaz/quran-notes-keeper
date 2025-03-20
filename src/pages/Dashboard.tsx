import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ProjectList from "@/components/ProjectList";
import NoteList from "@/components/NoteList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, StickyNote } from "lucide-react";
import { signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!currentUser) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-serif font-bold">Quran Notes</h1>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex items-center gap-2 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={currentUser.photoURL || "?"}
                        alt="User Avatar"
                      />
                      <AvatarFallback>{currentUser.email[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 group"
                  >
                    <LogOut className="h-5 w-5 transition-all duration-200" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <Tabs defaultValue="projects" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Reading Passes</span>
            </TabsTrigger>
            <TabsTrigger value="all-notes" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              <span>All Notes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="animate-fade-in">
            {currentUser && <ProjectList userId={currentUser.uid} />}
          </TabsContent>

          <TabsContent value="all-notes" className="animate-fade-in">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">All Notes</h2>
              <Separator className="mb-6" />
              {currentUser && <NoteList userId={currentUser.uid} />}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
