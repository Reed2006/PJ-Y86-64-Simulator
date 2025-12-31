import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, Upload, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  onLoad: () => void;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onReset: () => void;
  isRunning: boolean;
  isPaused: boolean;
  status: string;
  cycle: number;
  pc: number;
}

const ControlPanel = ({
  onLoad,
  onRun,
  onStep,
  onPause,
  onReset,
  isRunning,
  isPaused,
  status,
  cycle,
  pc,
}: ControlPanelProps) => {
  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  const ControlButton = ({
    onClick,
    icon: Icon,
    label,
    variant = 'default',
    disabled = false,
    glowColor = 'cyan',
  }: {
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    disabled?: boolean;
    glowColor?: 'cyan' | 'green' | 'purple' | 'red';
  }) => {
    const glowClasses = {
      cyan: 'hover:shadow-[0_0_20px_hsl(180,100%,50%,0.5)] hover:border-cyan-400',
      green: 'hover:shadow-[0_0_20px_hsl(120,100%,50%,0.5)] hover:border-green-400',
      purple: 'hover:shadow-[0_0_20px_hsl(280,100%,50%,0.5)] hover:border-purple-400',
      red: 'hover:shadow-[0_0_20px_hsl(0,100%,50%,0.5)] hover:border-red-400',
    };

    const iconColors = {
      cyan: 'text-cyan-400',
      green: 'text-green-400',
      purple: 'text-purple-400',
      red: 'text-red-400',
    };

    return (
      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'relative overflow-hidden bg-card/80 border border-cyan-500/30',
            'px-4 py-2 h-auto flex flex-col items-center gap-1',
            'transition-all duration-300 cyber-button',
            glowClasses[glowColor],
            disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          <Icon className={cn('w-5 h-5', iconColors[glowColor])} />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </Button>
      </motion.div>
    );
  };

  const statusColors: Record<string, string> = {
    AOK: 'text-green-400 text-glow-green',
    HLT: 'text-yellow-400',
    ADR: 'text-red-400',
    INS: 'text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="border border-cyan-500/30 rounded-lg bg-card/50 backdrop-blur-sm glow-border-cyan"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/30">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-400 tracking-wider uppercase">
            控制中心
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">状态:</span>
            <span className={cn('text-sm font-bold', statusColors[status] || 'text-muted-foreground')}>
              {status}
            </span>
          </div>
          {/* Cycle Counter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">周期:</span>
            <span className="text-sm font-mono text-purple-400">{cycle}</span>
          </div>
          {/* PC Display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">PC:</span>
            <span className="text-sm font-mono text-cyan-400">
              0x{pc.toString(16).padStart(4, '0').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3 p-4">
        <ControlButton
          onClick={onLoad}
          icon={Upload}
          label="加载"
          glowColor="purple"
          disabled={isRunning && !isPaused}
        />
        
        <ControlButton
          onClick={onRun}
          icon={Play}
          label="运行"
          glowColor="green"
          disabled={status !== 'AOK'}
        />
        
        <ControlButton
          onClick={onStep}
          icon={SkipForward}
          label="单步"
          glowColor="cyan"
          disabled={status !== 'AOK'}
        />
        
        <ControlButton
          onClick={onPause}
          icon={Pause}
          label="暂停"
          glowColor="purple"
          disabled={!isRunning || isPaused}
        />
        
        <ControlButton
          onClick={onReset}
          icon={RotateCcw}
          label="重置"
          glowColor="red"
        />
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center justify-center gap-6 px-4 py-2 border-t border-cyan-500/20 text-xs text-muted-foreground">
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-cyan-400">F5</kbd> 运行</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-cyan-400">F10</kbd> 单步</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-cyan-400">F6</kbd> 暂停</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-cyan-400">Ctrl+R</kbd> 重置</span>
      </div>
    </motion.div>
  );
};

export default ControlPanel;
