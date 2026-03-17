import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, BookOpen, Share2, Check, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Member } from '@/lib/types';
import { AvatarBubble } from './AvatarBubble';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroupHeaderProps {
  groupName: string;
  groupId: string;
  members: Member[];
  onOpenLedger: () => void;
}

export function GroupHeader({ groupName, groupId, members, onOpenLedger }: GroupHeaderProps) {
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      // Check for existing invite
      const { data: existing } = await supabase
        .from('group_invites')
        .select('token')
        .eq('group_id', groupId)
        .limit(1)
        .single();

      let token = existing?.token;

      if (!token) {
        const { data: newInvite, error } = await supabase
          .from('group_invites')
          .insert({ group_id: groupId, created_by: (await supabase.auth.getUser()).data.user!.id })
          .select('token')
          .single();
        if (error) throw error;
        token = newInvite!.token;
      }

      const link = `${window.location.origin}/join/${token}`;

      if (navigator.share) {
        await navigator.share({ title: `Join ${groupName}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        toast.success('Invite link copied!');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error('Failed to create invite link');
      }
    }
    setSharing(false);
  };

  return (
    <div className="bg-card border-b-1.5 border-foreground px-3 py-3 flex items-center gap-2 safe-area-pt">
      <button className="p-1 -ml-1" onClick={() => navigate('/')}>
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-base leading-tight truncate">{groupName}</h1>
        <div className="flex items-center gap-1 mt-0.5">
          {members.map((m) => (
            <AvatarBubble key={m.id} member={m} size="sm" isActive />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">{members.length} members</span>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleShare}
        disabled={sharing}
        className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
      >
        <Share2 className="h-4 w-4" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onOpenLedger}
        className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
      >
        <BookOpen className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
