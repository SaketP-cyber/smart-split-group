import { motion } from 'framer-motion';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Member } from '@/lib/types';
import { AvatarBubble } from './AvatarBubble';

interface GroupHeaderProps {
  groupName: string;
  members: Member[];
  onOpenLedger: () => void;
}

export function GroupHeader({ groupName, members, onOpenLedger }: GroupHeaderProps) {
  const navigate = useNavigate();
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
        onClick={onOpenLedger}
        className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
      >
        <BookOpen className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
