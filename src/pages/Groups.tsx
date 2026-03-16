import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, ChevronRight, Receipt, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface GroupRow {
  id: string;
  name: string;
  members: { initials: string; color: string }[];
  created_at: string;
}

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setGroups(data.map(g => ({
        ...g,
        members: (g.members as any[]) || [],
      })));
    }
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const defaultMembers = [{ initials: 'YO', color: 'bg-blue-100 text-blue-700' }];
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: newGroupName.trim().toLowerCase(), members: defaultMembers as any })
      .select()
      .single();
    if (!error && data) {
      setGroups(prev => [{ ...data, members: defaultMembers }, ...prev]);
      setNewGroupName('');
      setShowCreate(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">smart split</p>
          <h1 className="font-display text-3xl text-foreground">your groups</h1>
        </motion.div>
      </div>

      {/* Create new group */}
      <div className="px-5 pb-3">
        <AnimatePresence mode="wait">
          {showCreate ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card border-1.5 border-foreground rounded-2xl p-4 shadow-card-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">new group</p>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  placeholder="group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  className="bg-muted border-0 rounded-xl text-sm"
                  autoFocus
                />
                <Button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="w-full bg-foreground text-background rounded-xl font-display text-sm hover:bg-foreground/90"
                >
                  create group
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 bg-primary/10 border-1.5 border-dashed border-primary/40 rounded-2xl px-4 py-3.5 text-primary hover:bg-primary/15 transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Plus className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-medium">create new group</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Groups list */}
      <div className="flex-1 px-5 space-y-2.5 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            no groups yet — create one above!
          </div>
        ) : (
          groups.map((group, i) => (
            <motion.button
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/chat/${group.id}`)}
              className="w-full bg-card border-1.5 border-foreground rounded-2xl px-4 py-3.5 shadow-card-sm hover:shadow-card transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {group.members.slice(0, 4).map((m, j) => (
                        <div
                          key={j}
                          className={`h-6 w-6 rounded-full text-[9px] font-bold flex items-center justify-center border-1.5 border-card ${m.color}`}
                        >
                          {m.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
