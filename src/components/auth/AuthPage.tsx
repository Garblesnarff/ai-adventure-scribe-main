import { Loader2, Sparkles, TestTube } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check if we're in development mode
  const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development';
  const testEmail = import.meta.env.VITE_DEV_TEST_EMAIL || 'test@example.com';
  const testPassword = import.meta.env.VITE_DEV_TEST_PASSWORD || 'testpass123';

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(signInData.email, signInData.password);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Successfully signed in!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signUpData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email for the confirmation link!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAccountLogin = async () => {
    setLoading(true);

    try {
      const { error } = await signIn(testEmail, testPassword);

      if (error) {
        toast.error(`Test account login failed: ${error.message}`);
      } else {
        toast.success('Logged in with test account!');
      }
    } catch (error) {
      toast.error('Failed to login with test account');
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = () => {
    setSignInData({
      email: testEmail,
      password: testPassword,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-12 w-12 text-purple-400" />
            {isDevelopment && (
              <div className="ml-2 bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded">
                DEV MODE
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">InfiniteRealms</h1>
          <p className="text-purple-200">Your World, Your Story, Forever</p>
        </div>

        {/* Development Test Account Section */}
        {isDevelopment && (
          <Card className="bg-yellow-500/10 backdrop-blur-md border-yellow-500/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-yellow-300 text-center flex items-center justify-center gap-2">
                <TestTube className="h-5 w-5" />
                Development Test Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleTestAccountLogin}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Quick Login
                </Button>
                <Button
                  onClick={fillTestCredentials}
                  variant="outline"
                  className="flex-1 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10"
                  disabled={loading}
                >
                  Fill Form
                </Button>
              </div>
              <p className="text-xs text-yellow-200/70 text-center">
                Email: {testEmail} • Password: {testPassword}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/10 backdrop-blur-md border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white text-center">Welcome, Adventurer</CardTitle>
            <CardDescription className="text-purple-200 text-center">
              Sign in to continue your quest or create a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-purple-900/30">
                <TabsTrigger
                  value="signin"
                  className="text-white data-[state=active]:bg-purple-600"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="text-white data-[state=active]:bg-purple-600"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-white">
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className="bg-white/10 border-purple-500/30 text-white placeholder:text-purple-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-white">
                      Password
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className="bg-white/10 border-purple-500/30 text-white placeholder:text-purple-300"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="bg-white/10 border-purple-500/30 text-white placeholder:text-purple-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className="bg-white/10 border-purple-500/30 text-white placeholder:text-purple-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-white">
                      Confirm Password
                    </Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, confirmPassword: e.target.value })
                      }
                      className="bg-white/10 border-purple-500/30 text-white placeholder:text-purple-300"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
