import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import { Breakpoint } from '@/lib/y86/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface BreakpointPanelProps {
  breakpoints: Breakpoint[];
  onToggle: (address: number) => void;
  onRemove: (address: number) => void;
  onAddConditional: (address: number, condition: string) => void;
}

const BreakpointPanel = ({
  breakpoints,
  onToggle,
  onRemove,
  onAddConditional,
}: BreakpointPanelProps) => {
  const [editingBpId, setEditingBpId] = useState<string | null>(null);
  const [conditionInput, setConditionInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newCondition, setNewCondition] = useState('');

  const handleEditCondition = (bp: Breakpoint) => {
    setEditingBpId(bp.id);
    setConditionInput(bp.condition || '');
  };

  const handleSaveCondition = (bp: Breakpoint) => {
    onAddConditional(bp.address, conditionInput);
    setEditingBpId(null);
    setConditionInput('');
  };

  const handleCancelEdit = () => {
    setEditingBpId(null);
    setConditionInput('');
  };

  const handleAddBreakpoint = () => {
    const addr = parseInt(newAddress, 16);
    if (!isNaN(addr)) {
      if (newCondition.trim()) {
        onAddConditional(addr, newCondition.trim());
      }
      setNewAddress('');
      setNewCondition('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="border border-red-500/30 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-500/30 bg-gradient-to-r from-red-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-red-400 tracking-wider uppercase">
            断点调试
          </span>
          <span className="text-xs text-muted-foreground">
            ({breakpoints.filter(bp => bp.enabled).length}/{breakpoints.length})
          </span>
        </div>
        
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant="ghost"
          className="h-7 px-2 hover:bg-red-500/20 text-red-400"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">添加</span>
        </Button>
      </div>

      {/* Add Breakpoint Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-red-500/20 overflow-hidden"
          >
            <div className="p-3 space-y-2 bg-red-500/5">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  地址（十六进制）
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    0x
                  </span>
                  <Input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="000"
                    className="h-8 pl-6 text-xs font-mono bg-card/50 border-red-500/30"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  条件（可选）
                </label>
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="例如: rax==10"
                  className="h-8 text-xs font-mono bg-card/50 border-red-500/30"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddBreakpoint}
                  size="sm"
                  className="flex-1 h-7 bg-red-500 hover:bg-red-600 text-white"
                >
                  添加
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAddress('');
                    setNewCondition('');
                  }}
                  size="sm"
                  variant="ghost"
                  className="flex-1 h-7 hover:bg-red-500/20"
                >
                  取消
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breakpoint List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {breakpoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Circle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>未设置断点</p>
              <p className="text-xs mt-1">点击行号添加断点</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {breakpoints.map((bp) => (
                  <motion.div
                    key={bp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    layout
                    className={cn(
                      'p-2 rounded border transition-all',
                      bp.enabled 
                        ? 'border-red-500/30 bg-red-500/10' 
                        : 'border-red-500/10 bg-card/30'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Toggle button */}
                      <button
                        onClick={() => onToggle(bp.address)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        <Circle
                          className={cn(
                            'w-4 h-4 transition-all',
                            bp.enabled 
                              ? 'text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]' 
                              : 'text-red-500/30 fill-red-500/30'
                          )}
                        />
                      </button>

                      {/* Breakpoint info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-mono',
                            bp.enabled ? 'text-red-400' : 'text-muted-foreground'
                          )}>
                            0x{bp.address.toString(16).padStart(4, '0').toUpperCase()}
                          </span>
                          {bp.hitCount > 0 && (
                            <span className="text-xs text-muted-foreground bg-red-500/20 px-1.5 py-0.5 rounded">
                              {bp.hitCount} 次命中
                            </span>
                          )}
                        </div>

                        {/* Condition */}
                        {editingBpId === bp.id ? (
                          <div className="mt-1 flex gap-1">
                            <Input
                              value={conditionInput}
                              onChange={(e) => setConditionInput(e.target.value)}
                              placeholder="例如: rax==10"
                              className="h-6 text-xs font-mono bg-card/50 border-red-500/30"
                              autoFocus
                            />
                            <Button
                              onClick={() => handleSaveCondition(bp)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-green-500/20"
                            >
                              <Check className="w-3 h-3 text-green-400" />
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-red-500/20"
                            >
                              <X className="w-3 h-3 text-red-400" />
                            </Button>
                          </div>
                        ) : bp.condition ? (
                          <div className="mt-1 text-xs font-mono text-purple-400/80 bg-purple-500/10 px-1.5 py-0.5 rounded inline-block">
                            if {bp.condition}
                          </div>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          onClick={() => handleEditCondition(bp)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-purple-500/20"
                        >
                          <Edit2 className="w-3 h-3 text-purple-400/60" />
                        </Button>
                        <Button
                          onClick={() => onRemove(bp.address)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3 text-red-400/60" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-red-500/20 text-[10px] text-muted-foreground">
        点击编辑器行号切换断点
      </div>
    </div>
  );
};

export default BreakpointPanel;
