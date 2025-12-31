import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { RegisterFile } from '@/lib/y86/types';
import { cn } from '@/lib/utils';

interface RegisterPanelProps {
  registers: RegisterFile;
  previousRegisters?: RegisterFile;
}

const RegisterCard = ({
  name,
  value,
  previousValue,
  delay,
}: {
  name: string;
  value: bigint;
  previousValue?: bigint;
  delay: number;
}) => {
  const [isChanged, setIsChanged] = useState(false);
  
  // 修复：生成无前导零的十六进制字符串
  const hexValue = value.toString(16).toUpperCase();
  
  // 如果值为0，toString(16) 返回 '0'，我们也可以显示 '0' 或 '0x0'
  const displayValue = hexValue;
  const fullDisplay = value < 0n 
    ? (value + 0x10000000000000000n).toString(16).padStart(16, '0').toUpperCase()
    : value.toString(16).padStart(16, '0').toUpperCase();

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
      transition={{ duration: 0.3, delay: delay * 0.05 }}
      className={cn(
        'relative p-3 rounded-lg border bg-card/60 backdrop-blur-sm',
        'transition-all duration-300',
        isChanged
          ? 'border-cyan-400 shadow-[0_0_15px_hsl(180,100%,50%,0.4)]'
          : 'border-cyan-500/20 hover:border-cyan-500/40'
      )}
    >
      {/* Register Name */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          'text-xs font-bold uppercase tracking-wider',
          name.startsWith('r') && name.length <= 3 ? 'text-purple-400' : 'text-cyan-400'
        )}>
          %{name}
        </span>
        {value !== 0n && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 indicator-on" />
        )}
      </div>

      {/* Register Value */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayValue}
            initial={isChanged ? { y: -10, opacity: 0 } : {}}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-sm"
          >
            {/* 修复：直接显示无前导零的数值 */}
            <span className={cn(
              'block truncate',
              isChanged ? 'text-cyan-300 neon-cyan' : 'text-foreground/90'
            )}>
              {displayValue}
            </span>
          </motion.div>
        </AnimatePresence>
        
        {/* Full value tooltip on hover (keeping full hex for detail) */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-[#1a1a1a]/98 border border-cyan-400/50
                        flex items-center justify-center transition-all duration-200 z-10 rounded shadow-lg">
          <span className="text-xs font-mono text-cyan-300 tracking-wider">
            0x{fullDisplay}
          </span>
        </div>
      </div>

      {/* Change indicator */}
      {isChanged && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 origin-left"
        />
      )}
    </motion.div>
  );
};

const RegisterPanel = ({ registers, previousRegisters }: RegisterPanelProps) => {
  const registerOrder: (keyof RegisterFile)[] = [
    'rax', 'rcx', 'rdx', 'rbx', 'rsp',
    'rbp', 'rsi', 'rdi', 'r8', 'r9',
    'r10', 'r11', 'r12', 'r13', 'r14',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="border border-cyan-500/30 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-400 tracking-wider uppercase">
          寄存器组
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          64-bit
        </span>
      </div>

      {/* Register Grid */}
      <div className="p-3">
        <div className="grid grid-cols-5 gap-2">
          {registerOrder.map((name, index) => (
            <RegisterCard
              key={name}
              name={name}
              value={registers[name]}
              previousValue={previousRegisters?.[name]}
              delay={index}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-cyan-500/20 flex items-center justify-between text-xs text-muted-foreground">
        <span>悬停查看完整64位值</span>
        <span className="text-cyan-400/60">小端序</span>
      </div>
    </motion.div>
  );
};

export default RegisterPanel;