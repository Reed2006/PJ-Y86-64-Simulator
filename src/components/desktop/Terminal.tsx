import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExecutionLog } from '@/lib/y86/types';

interface TerminalProps {
  logs: ExecutionLog[];
  onClear: () => void;
}

const Terminal = ({ logs, onClear }: TerminalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new logs
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: ExecutionLog['type']) => {
    switch (type) {
      case 'info':
        return 'text-cyan-400';
      case 'success':
        return 'text-green-400 neon-green';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-foreground';
    }
  };

  const getLogPrefix = (type: ExecutionLog['type']) => {
    switch (type) {
      case 'info':
        return '[INFO]';
      case 'success':
        return '[OK]';
      case 'warning':
        return '[WARN]';
      case 'error':
        return '[ERR]';
      default:
        return '[LOG]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="border border-green-500/30 rounded-lg bg-[#0a0f0a] overflow-hidden flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-green-400 tracking-wider uppercase">
            输出终端
          </span>
        </div>
        <Button
          onClick={onClear}
          size="sm"
          variant="ghost"
          className="h-7 px-2 hover:bg-green-500/20 text-green-400/60 hover:text-green-400"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">清空</span>
        </Button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative overflow-y-auto" ref={scrollRef}>
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none scanlines opacity-30" />
        
        <div className="p-3 font-mono text-sm space-y-1">
          {/* Welcome message */}
          {logs.length === 0 && (
            <div className="text-green-400/60">
              <p className="neon-green">Y86-64 CPU 模拟器 v1.0</p>
              <p className="text-green-400/40 mt-1">
                准备就绪。加载程序开始执行。
              </p>
              <p className="text-green-400/40 animate-pulse terminal-cursor mt-2">
                {'> '}
              </p>
            </div>
          )}

          {/* Log entries */}
          {logs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2"
            >
              {/* Timestamp */}
              <span className="text-green-400/40 text-xs flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
              
              {/* Cycle */}
              {log.cycle > 0 && (
                <span className="text-purple-400/60 text-xs flex-shrink-0">
                  C{log.cycle.toString().padStart(3, '0')}
                </span>
              )}
              
              {/* Log type prefix */}
              <span className={cn('text-xs flex-shrink-0 w-12', getLogColor(log.type))}>
                {getLogPrefix(log.type)}
              </span>
              
              {/* Message */}
              <span className={cn('text-xs break-all', getLogColor(log.type))}>
                {log.message}
              </span>
            </motion.div>
          ))}

          {/* Cursor */}
          {logs.length > 0 && (
            <div className="text-green-400/60 animate-pulse terminal-cursor">
              {'> '}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-1.5 border-t border-green-500/20 flex items-center justify-between text-[10px] text-green-400/50">
        <span>{logs.length} 条记录</span>
        <span className="font-mono">TTY:0</span>
      </div>
    </motion.div>
  );
};

export default Terminal;
