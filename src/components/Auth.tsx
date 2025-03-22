import { useState, useEffect } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface AuthProps {
  onAuthStateChange?: (user: User | null) => void;
}

export const Auth = ({ onAuthStateChange }: AuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          toast({
            title: "Signed in with Google",
            description: "You have successfully signed in with Google",
          });
        }
      } catch (error) {
        if (
          error instanceof FirebaseError &&
          error.code !== "auth/redirect-cancelled-by-user"
        ) {
          toast({
            title: "Google sign in failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        setIsRedirecting(false);
      }
    };
    checkRedirect();
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (onAuthStateChange) {
        onAuthStateChange(user);
      }
    });

    return () => unsubscribe();
  }, [onAuthStateChange]);

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Account created",
        description: "Your account has been created successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof FirebaseError
          ? error.message
          : "An unknown error occurred";
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Signed in",
        description: "You have successfully signed in",
      });
    } catch (error) {
      const errorMessage =
        error instanceof FirebaseError
          ? error.message
          : "An unknown error occurred";
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isRedirecting) return;

    setIsRedirecting(true);
    setIsLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      setIsRedirecting(false);
      setIsLoading(false);
      const errorMessage =
        error instanceof FirebaseError
          ? error.message
          : "An unknown error occurred";
      toast({
        title: "Google sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof FirebaseError
          ? error.message
          : "An unknown error occurred";
      toast({
        title: "Sign out failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (currentUser) {
    return (
      <Card className="w-full max-w-md mx-auto animate-fade-in glass-card">
        <CardHeader>
          <CardTitle className="text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Signed in as {currentUser.email}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={handleSignOut} className="w-full" variant="outline">
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      <CardHeader>
        <CardTitle className="text-center">Quran Notes</CardTitle>
        <CardDescription className="text-center">
          Sign in to access your notes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isRedirecting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isRedirecting}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSignIn}
              disabled={isLoading || isRedirecting}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isRedirecting}
            >
              Sign in with Google
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isRedirecting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isRedirecting}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSignUp}
              disabled={isLoading || isRedirecting}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isRedirecting}
            >
              Sign up with Google
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Auth;
