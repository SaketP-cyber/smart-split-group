import { motion } from 'framer-motion';

export function ScanningCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-card border-1.5 border-foreground rounded-2xl p-4 shadow-card w-full max-w-sm relative overflow-hidden"
    >
      {/* Scanning laser line */}
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-primary z-10"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            <div className="h-2 w-16 bg-muted rounded mt-1 animate-pulse" />
          </div>
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <div className="flex-1 h-3 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
            <div className="flex gap-1">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-7 w-7 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ))}
        <div className="border-t border-foreground/10 pt-3">
          <div className="h-12 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3">scanning receipt...</p>
    </motion.div>
  );
}
