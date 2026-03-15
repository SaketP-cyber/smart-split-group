import { motion } from 'framer-motion';
import { Member } from '@/lib/types';
import { AvatarBubble } from './AvatarBubble';

interface ChatBubbleProps {
  content: string;
  sender: Member;
  isOwn: boolean;
  timestamp: Date;
}

export function ChatBubble({ content, sender, isOwn, timestamp }: ChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={`flex gap-2 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}
    >
      {!isOwn && <AvatarBubble member={sender} size="sm" isActive />}
      <div>
        {!isOwn && (
          <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{sender.name.toLowerCase()}</p>
        )}
        <div
          className={`
            rounded-2xl px-3.5 py-2 text-sm
            ${isOwn
              ? 'bg-foreground text-background rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
            }
          `}
        >
          {content}
        </div>
        <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isOwn ? 'text-right' : ''}`}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}
