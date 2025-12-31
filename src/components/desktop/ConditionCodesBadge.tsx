import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { ConditionCodeFlags } from '@/lib/y86/types';
import { cn } from '@/lib/utils';

interface ConditionCodesBadgeProps {
  flags: ConditionCodeFlags;
  previousFlags?: ConditionCodeFlags;
}

const FlagBadge = ({
  name,
  value,
  previousValue,
  delay,
}: {
  name: string;
  value: boolean;
  previousValue?: boolean;
  delay: number;
}) => {
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    if (previousValue !== undefined && value !== previousValue) {
      setIsChanged(true);
      const timer = setTimeout(() => setIsChanged(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: delay * 0.1 }}
      className={cn(
        'px-3 py-1.5 rounded-md border transition-all duration-300 flex items-center gap-2',
        value
          ? 'bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
          : 'bg-card/30 border-border/40',
        isChanged && value && 'animate-pulse ring-2 ring-cyan-400/50'
      )}
    >
      {/* Indicator Light */}
      <div
        className={cn(
          'w-2 h-2 rounded-full transition-all duration-300',
          value
            ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
            : 'bg-gray-600'
        )}
      />

      {/* Flag Name and Value */}
      <span className={cn(
        'text-sm font-mono font-semibold',
        value ? 'text-cyan-300' : 'text-muted-foreground'
      )}>
        {name}
      </span>
      <span className={cn(
        'text-xs font-mono',
        value ? 'text-cyan-400/80' : 'text-muted-foreground/60'
      )}>
        {value ? '1' : '0'}
      </span>
    </motion.div>
  );
};

const ConditionCodesBadge = ({ flags, previousFlags }: ConditionCodesBadgeProps) => {
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
        <span className="ml-auto text-xs font-mono text-muted-foreground">
          {flags.ZF ? '1' : '0'}{flags.SF ? '1' : '0'}{flags.OF ? '1' : '0'}
        </span>
      </div>

      {/* Badges Grid */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <FlagBadge
            name="ZF"
            value={flags.ZF}
            previousValue={previousFlags?.ZF}
            delay={0}
          />
          <FlagBadge
            name="SF"
            value={flags.SF}
            previousValue={previousFlags?.SF}
            delay={1}
          />
          <FlagBadge
            name="OF"
            value={flags.OF}
            previousValue={previousFlags?.OF}
            delay={2}
          />
        </div>

        {/* Legend */}
        <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
          <div>ZF: 零标志 (Zero Flag)</div>
          <div>SF: 符号标志 (Sign Flag)</div>
          <div>OF: 溢出标志 (Overflow Flag)</div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConditionCodesBadge;
