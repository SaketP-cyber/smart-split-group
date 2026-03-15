import { motion } from 'framer-motion';

export function SystemMessage({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-2"
    >
      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
        {content}
      </span>
    </motion.div>
  );
}
