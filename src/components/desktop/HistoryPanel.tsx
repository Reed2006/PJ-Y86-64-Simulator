import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Download, GitBranch, ArrowRight, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider'; 
import { ExecutionSnapshot } from '@/lib/y86/types';

interface HistoryPanelProps {
  history?: ExecutionSnapshot[];
  onJumpToSnapshot?: (snapshotId: string) => void;
  onCompareSnapshots?: (snapshotId1: string, snapshotId2: string) => void;
  onExportHistory?: () => void;
  currentSnapshotId?: string;
}

export default function HistoryPanel({
  history = [],
  onJumpToSnapshot = () => {},
  onCompareSnapshots = () => {},
  onExportHistory = () => {},
  currentSnapshotId,
}: HistoryPanelProps) {
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // 计算当前快照的索引
  const maxIndex = Math.max(history.length - 1, 0);
  const currentIndex = history.findIndex(s => s.id === currentSnapshotId);
  
  // 为了模拟编辑器滚动条：顶部是 Index 0，底部是 Index N
  // Radix Slider 垂直模式：底部是 Min，顶部是 Max。
  // 我们需要反转逻辑： Slider Value = (MaxIndex - CurrentIndex)
  // 当 SliderValue = Max (顶部) -> CurrentIndex = 0 (Start)
  // 当 SliderValue = 0 (底部) -> CurrentIndex = Max (End)
  const sliderValue = currentIndex >= 0 ? [maxIndex - currentIndex] : [maxIndex];

  // 自动滚动到当前选中的快照
  useEffect(() => {
    if (currentSnapshotId && scrollViewportRef.current) {
      const activeElement = document.getElementById(`snapshot-${currentSnapshotId}`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSnapshotId]);

  const handleSnapshotClick = (snapshotId: string) => {
    if (selectedSnapshots.includes(snapshotId)) {
      setSelectedSnapshots(selectedSnapshots.filter(id => id !== snapshotId));
    } else if (selectedSnapshots.length < 2) {
      setSelectedSnapshots([...selectedSnapshots, snapshotId]);
    } else {
      setSelectedSnapshots([selectedSnapshots[1], snapshotId]);
    }
  };

  const handleJumpTo = (snapshotId: string) => {
    setSelectedSnapshots([]);
    onJumpToSnapshot(snapshotId);
  };

  const handleCompare = () => {
    if (selectedSnapshots.length === 2) {
      onCompareSnapshots(selectedSnapshots[0], selectedSnapshots[1]);
      setSelectedSnapshots([]);
    }
  };

  const handleSliderChange = (value: number[]) => {
    // 反转逻辑还原：CurrentIndex = MaxIndex - SliderValue
    const targetIndex = maxIndex - value[0];
    if (history[targetIndex]) {
      onJumpToSnapshot(history[targetIndex].id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card/30 backdrop-blur-sm border border-purple-500/30 rounded-lg overflow-hidden glow-border-purple">
      {/* Header */}
      <div className="p-3 border-b border-purple-500/30 bg-purple-900/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-purple-300">执行历史</h3>
          <span className="text-xs text-muted-foreground">
            ({history.length})
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {selectedSnapshots.length === 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCompare}
              className="h-7 px-2 text-xs border-purple-500/50 bg-purple-900/30 hover:bg-purple-800/50 text-purple-300"
            >
              <GitBranch className="w-3 h-3 mr-1" />
              对比
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={onExportHistory}
            disabled={history.length === 0}
            className="h-7 px-2 text-xs border-purple-500/50 bg-purple-900/30 hover:bg-purple-800/50 text-purple-300"
          >
            <Download className="w-3 h-3 mr-1" />
            导出
          </Button>
        </div>
      </div>

      {/* Main Content Area: List + Slider */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Snapshot List */}
        <ScrollArea className="flex-1 h-full" viewportRef={scrollViewportRef}>
          <div className="p-3 space-y-2 pr-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <Activity className="w-10 h-10 mb-2 opacity-20 text-purple-400" />
                <p className="text-sm">暂无执行历史</p>
                <p className="text-xs mt-1 opacity-60">运行程序后将记录每步状态</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {history.map((snapshot, index) => {
                  const isSelected = selectedSnapshots.includes(snapshot.id);
                  const isCurrent = snapshot.id === currentSnapshotId;
                  const selectionOrder = selectedSnapshots.indexOf(snapshot.id) + 1;

                  return (
                    <motion.div
                      id={`snapshot-${snapshot.id}`}
                      key={snapshot.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`
                        p-2.5 rounded-md border cursor-pointer transition-all relative group
                        ${isCurrent 
                          ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                          : isSelected
                            ? 'border-purple-400 bg-purple-900/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]'
                            : 'border-purple-500/20 bg-card/20 hover:bg-purple-500/10 hover:border-purple-500/40'
                        }
                      `}
                      onClick={() => handleSnapshotClick(snapshot.id)}
                    >
                      {/* Active Indicator Line */}
                      {isCurrent && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-l-md" />
                      )}

                      <div className="flex items-center justify-between mb-1.5 pl-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-cyan-400' : 'text-purple-400'}`}>
                            Cycle {snapshot.cycle}
                          </span>
                          {selectionOrder > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/30 text-purple-200 rounded-full border border-purple-500/30">
                              #{selectionOrder}
                            </span>
                          )}
                        </div>
                        
                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJumpTo(snapshot.id);
                            }}
                            className="h-5 px-2 text-[10px] hover:bg-cyan-500/20 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            回溯
                            <ArrowRight className="w-2.5 h-2.5 ml-1" />
                          </Button>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-cyan-500/80 font-medium px-2">CURRENT</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pl-2">
                        <div className="flex items-center justify-between bg-black/20 px-2 py-1 rounded">
                          <span className="text-muted-foreground">PC</span>
                          <span className="font-mono text-cyan-200">
                            0x{snapshot.pc.toString(16).padStart(3, '0').toUpperCase()}
                          </span>
                        </div>
                        <div className="col-span-1 flex items-center gap-2 bg-black/20 px-2 py-1 rounded overflow-hidden">
                          <span className="text-muted-foreground flex-shrink-0">Instr</span>
                          <span className="font-mono text-purple-200 truncate">
                            {snapshot.instruction || 'nop'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Vertical Time Scrubber */}
        <div className="w-5 border-l border-purple-500/20 bg-black/20 flex flex-col items-center py-2 relative">
          <div className="h-full relative w-full flex justify-center">
             <Slider
              orientation="vertical"
              value={sliderValue}
              max={maxIndex}
              step={1}
              onValueChange={handleSliderChange}
              className="h-full cursor-grab active:cursor-grabbing"
              disabled={history.length === 0}
            />
          </div>
        </div>
        
      </div>

      {/* Comparison Hint */}
      {selectedSnapshots.length > 0 && (
        <div className="p-2 border-t border-purple-500/30 bg-purple-900/40 backdrop-blur-md shrink-0">
          <p className="text-[10px] text-purple-200 text-center animate-pulse">
            {selectedSnapshots.length === 1 
              ? '再选择一个快照进行对比...' 
              : '准备就绪，点击上方"对比"按钮'
            }
          </p>
        </div>
      )}
    </div>
  );
}