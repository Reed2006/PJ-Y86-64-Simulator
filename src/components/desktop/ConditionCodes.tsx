import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { ConditionCodeFlags } from '@/lib/y86/types';
import { cn } from '@/lib/utils';

interface ConditionCodesProps {
  flags: ConditionCodeFlags;
  previousFlags?: ConditionCodeFlags;
}

const FlagIndicator = ({
  name,
  value,
  previousValue,
  description,
  color,
}: {
  name: string;
  value: boolean;
  previousValue?: boolean;
  description: string;
  color: 'cyan' | 'purple' | 'green';
}) => {
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    if (previousValue !== undefined && value !== previousValue) {
      setIsChanged(true);
      const timer = setTimeout(() => setIsChanged(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue]);

  const colorClasses = {
    cyan: {
      on: 'bg-cyan-400 shadow-[0_0_15px_hsl(180,100%,50%,0.8),0_0_30px_hsl(180,100%,50%,0.4)]',
      off: 'bg-cyan-900/30',
      text: 'text-cyan-400',
      border: 'border-cyan-500/40',
    },
    purple: {
      on: 'bg-purple-400 shadow-[0_0_15px_hsl(280,100%,50%,0.8),0_0_30px_hsl(280,100%,50%,0.4)]',
      off: 'bg-purple-900/30',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
    },
    green: {
      on: 'bg-green-400 shadow-[0_0_15px_hsl(120,100%,50%,0.8),0_0_30px_hsl(120,100%,50%,0.4)]',
      off: 'bg-green-900/30',
      text: 'text-green-400',
      border: 'border-green-500/40',
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border bg-card/40',
        'transition-all duration-300',
        classes.border,
        isChanged && 'ring-2 ring-offset-2 ring-offset-background ring-current'
      )}
    >
      {/* Indicator Light */}
      <motion.div
        animate={{
          scale: value ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 0.3,
          repeat: value && isChanged ? 2 : 0,
        }}
        className={cn(
          'w-8 h-8 rounded-full transition-all duration-300',
          value ? classes.on : classes.off
        )}
      />
      
      {/* Flag Name */}
      <span className={cn(
        'text-lg font-bold tracking-wider',
        value ? classes.text : 'text-muted-foreground'
      )}>
        {name}
      </span>
      
      {/* Value */}
      <span className={cn(
        'text-sm font-mono',
        value ? 'text-foreground' : 'text-muted-foreground/60'
      )}>
        {value ? '1' : '0'}
      </span>
      
      {/* Description */}
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {description}
      </span>
    </motion.div>
  );
};

const ConditionCodes = ({ flags, previousFlags }: ConditionCodesProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="border border-purple-500/30 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-transparent">
        <Activity className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-400 tracking-wider uppercase">
          条件码
        </span>
      </div>

      {/* Flags */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <FlagIndicator
            name="ZF"
            value={flags.ZF}
            previousValue={previousFlags?.ZF}
            description="零标志"
            color="cyan"
          />
          <FlagIndicator
            name="SF"
            value={flags.SF}
            previousValue={previousFlags?.SF}
            description="符号标志"
            color="purple"
          />
          <FlagIndicator
            name="OF"
            value={flags.OF}
            previousValue={previousFlags?.OF}
            description="溢出标志"
            color="green"
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-purple-500/20 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>由 OPq 指令更新</span>
          <span className="font-mono text-purple-400/60">
            {flags.ZF ? '1' : '0'}{flags.SF ? '1' : '0'}{flags.OF ? '1' : '0'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ConditionCodes;
