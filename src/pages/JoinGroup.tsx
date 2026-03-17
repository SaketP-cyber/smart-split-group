import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinGroup() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Store token and redirect to auth
      sessionStorage.setItem('pending_invite', token || '');
      navigate('/auth', { replace: true });
      return;
    }
    joinGroup();
  }, [user, authLoading, token]);

  const joinGroup = async () => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid invite link');
      return;
    }

    const { data, error } = await supabase.rpc('join_group_via_invite', {
      _token: token,
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setGroupId(data as string);
      setStatus('success');
      setTimeout(() => navigate(`/chat/${data}`, { replace: true }), 1500);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">joining group...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">you're in! redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-medium text-foreground">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-primary underline"
            >
              go to groups
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
