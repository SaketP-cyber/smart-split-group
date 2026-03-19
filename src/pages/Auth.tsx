import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff, Receipt, Users, Zap, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

const taglines = [
  { text: "stop doing math after dinner", icon: Receipt },
  { text: "snap. split. done.", icon: Camera },
  { text: "your friends owe you ₹427", icon: Zap },
  { text: "no more awkward money talks", icon: Users },
  { text: "AI reads receipts so you don't", icon: Receipt },
];

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success('Check your email for a verification link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  const currentTagline = taglines[taglineIndex];

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-5 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm space-y-5"
      >
        {/* Animated hero section */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border-1.5 border-primary/30 mx-auto"
          >
            <Receipt className="h-7 w-7 text-primary" />
          </motion.div>

          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-[0.2em] mb-1">smart split</p>
            <h1 className="font-display text-3xl text-foreground">
              {isSignUp ? 'join the crew' : 'welcome back'}
            </h1>
          </div>

          {/* Rotating taglines */}
          <div className="h-8 relative flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={taglineIndex}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="absolute flex items-center gap-1.5"
              >
                <currentTagline.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm text-muted-foreground font-medium">{currentTagline.text}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Floating social proof pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center justify-center gap-2"
        >
          <div className="flex -space-x-2">
            {['bg-primary', 'bg-destructive', 'bg-ring', 'bg-muted-foreground'].map((color, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: -10 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 300 }}
                className={`h-6 w-6 rounded-full ${color} border-2 border-background`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">splitting bills together</span>
        </motion.div>

        {/* Google button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          variant="outline"
          className="w-full h-12 rounded-2xl border-1.5 border-foreground font-medium text-sm shadow-card-sm hover:shadow-card transition-shadow"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          continue with google
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-muted border-0 text-sm"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12 rounded-2xl bg-muted border-0 text-sm"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-foreground text-background font-display text-sm hover:bg-foreground/90 shadow-card-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? 'sign up' : 'sign in'}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? 'already have an account?' : "don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? 'sign in' : 'sign up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
