import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Check, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpeakerManagerProps {
  speakerMap: Record<string, string>;
  onSpeakerRename: (originalName: string, newName: string) => void;
}

export function SpeakerManager({ speakerMap, onSpeakerRename }: SpeakerManagerProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const speakers = Object.entries(speakerMap);

  const startEdit = (key: string, currentName: string) => {
    setEditingKey(key);
    setEditName(currentName);
  };

  const saveEdit = (key: string) => {
    if (editName.trim()) {
      onSpeakerRename(key, editName.trim());
    }
    setEditingKey(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditName('');
  };

  if (speakers.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Người tham gia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {speakers.map(([key, name], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>

              {editingKey === key ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(key);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => saveEdit(key)}
                    className="h-8 w-8"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={cancelEdit}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium text-foreground flex-1">
                    {name}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEdit(key, name)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
