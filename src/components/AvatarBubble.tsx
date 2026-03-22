import { motion } from 'framer-motion';
import { Member } from '@/lib/types';

interface AvatarBubbleProps {
  member: Member;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onTap?: () => void;
}

const sizeMap = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export function AvatarBubble({ member, isActive = false, size = 'md', onTap }: AvatarBubbleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTap?.();
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      type="button"
      className={`
        ${sizeMap[size]} rounded-full font-bold border-1.5
        flex items-center justify-center select-none cursor-pointer shrink-0
        transition-all duration-200
        ${member.color}
        ${isActive ? 'shadow-card-sm ring-2 ring-foreground/20 opacity-100' : 'opacity-40'}
      `}
    >
      {member.initials}
    </motion.button>
  );
}
