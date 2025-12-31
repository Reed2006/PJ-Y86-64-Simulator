import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Circle } from 'lucide-react';
import { Breakpoint } from '@/lib/y86/types';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  breakpoints?: Breakpoint[];
  onBreakpointToggle?: (address: number) => void;
  currentPC?: number;
}

// Sample Y86 program for demonstration
export const SAMPLE_PROGRAM = `# Y86-64 sample program
# Compute Fibonacci(7)
# Result stored in %rax

0x000: 30f70700000000000000 | irmovq $7, %rdi        # n = 7
0x00a: 30f00000000000000000 | irmovq $0, %rax        # fib(0) = 0
0x014: 30f10100000000000000 | irmovq $1, %rcx        # fib(1) = 1
0x01e: 30f20100000000000000 | irmovq $1, %rdx        # i = 1
# Loop start
0x028: 6277                 | subq %rdi, %rdi        # check n
0x02a: 733800000000000000   | je done                # if n == 0 jump
0x033: 6272                 | subq %rdi, %rdx        # i - n
0x035: 744c00000000000000   | jge done               # if i >= n stop
# Next value
0x03e: 2001                 | rrmovq %rax, %rcx      # temp = fib(n-2)
0x040: 6010                 | addq %rcx, %rax        # fib(n) = fib(n-1) + fib(n-2)
0x042: 2010                 | rrmovq %rcx, %rax      # update fib(n-1)
0x044: 30f30100000000000000 | irmovq $1, %rbx        # i++
0x04e: 6032                 | addq %rbx, %rdx
0x050: 702800000000000000   | jmp loop               # continue loop
# End
0x059: 10                   | nop
0x05a: 10                   | nop
0x05b: 00                   | halt
`;

const CodeEditor = ({ 
  value, 
  onChange, 
  readOnly = false, 
  breakpoints = [],
  onBreakpointToggle,
  currentPC,
}: CodeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const lineCount = lines.length;

  // Extract address from line
  const getAddressFromLine = (line: string): number | null => {
    const match = line.match(/^0x([0-9a-fA-F]+):/);
    if (match) {
      return parseInt(match[1], 16);
    }
    return null;
  };

  // Check if line has breakpoint
  const hasBreakpoint = (address: number | null): Breakpoint | undefined => {
    if (address === null) return undefined;
    return breakpoints.find(bp => bp.address === address);
  };

  // Check if line is current execution line
  const isCurrentLine = (address: number | null): boolean => {
    if (address === null || currentPC === undefined) return false;
    return address === currentPC;
  };

  useEffect(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [value]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleLineClick = (lineIndex: number) => {
    if (!onBreakpointToggle) return;
    
    const line = lines[lineIndex];
    const address = getAddressFromLine(line);
    
    if (address !== null) {
      onBreakpointToggle(address);
    }
  };

  const highlightLine = (line: string): JSX.Element => {
    // Simple syntax highlighting for Y86
    const parts: JSX.Element[] = [];
    
    // Comment
    const commentIndex = line.indexOf('|');
    if (commentIndex !== -1) {
      const beforeComment = line.substring(0, commentIndex + 1);
      const comment = line.substring(commentIndex + 1);
      
      // Address part
      const addrMatch = beforeComment.match(/^(0x[0-9a-fA-F]+:)/);
      if (addrMatch) {
        parts.push(
          <span key="addr" className="text-purple-400">{addrMatch[1]}</span>
        );
        const rest = beforeComment.substring(addrMatch[1].length, commentIndex);
        parts.push(
          <span key="bytes" className="text-cyan-400">{rest}</span>
        );
        parts.push(
          <span key="pipe" className="text-muted-foreground">|</span>
        );
      } else {
        parts.push(
          <span key="before" className="text-cyan-400">{beforeComment}</span>
        );
      }
      
      parts.push(
        <span key="comment" className="text-green-400">{comment}</span>
      );
    } else if (line.startsWith('#')) {
      parts.push(
        <span key="fullcomment" className="text-green-500">{line}</span>
      );
    } else {
      parts.push(<span key="plain">{line}</span>);
    }
    
    return <>{parts}</>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="relative h-full flex flex-col"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/30 bg-card/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-sm font-semibold text-cyan-400 tracking-wide">
          汇编代码编辑器
        </span>
        <div className="w-20" />
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden bg-[#0d0d14] relative">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none scanlines opacity-30" />
        
        {/* Breakpoint Gutter + Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="w-16 flex-shrink-0 overflow-hidden select-none bg-[#0a0a10] border-r border-cyan-500/20"
        >
          <div className="py-3">
            {Array.from({ length: lineCount }, (_, i) => {
              const address = getAddressFromLine(lines[i]);
              const bp = hasBreakpoint(address);
              const isCurrent = isCurrentLine(address);
              
              return (
                <div
                  key={i}
                  onClick={() => handleLineClick(i)}
                  className={cn(
                    'h-6 flex items-center gap-1 px-1 cursor-pointer hover:bg-cyan-500/10 transition-colors',
                    isCurrent && 'bg-purple-500/20',
                  )}
                >
                  {/* Breakpoint indicator */}
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {bp && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Circle
                          className={cn(
                            'w-3 h-3',
                            bp.enabled 
                              ? 'text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]' 
                              : 'text-red-500/30 fill-red-500/30'
                          )}
                        />
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Line number */}
                  <div className={cn(
                    'text-xs font-mono flex-1 text-right pr-1',
                    isCurrent ? 'text-purple-400 font-bold' : 'text-cyan-600/50'
                  )}>
                    {i + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Code Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Current line highlight (behind everything) */}
          {currentPC !== undefined && (
            <div className="absolute inset-0 py-3 overflow-hidden pointer-events-none">
              {lines.map((line, i) => {
                const address = getAddressFromLine(line);
                const isCurrent = isCurrentLine(address);
                return (
                  <div
                    key={i}
                    className={cn(
                      'h-6',
                      isCurrent && 'bg-purple-500/20 border-l-2 border-purple-400'
                    )}
                  />
                );
              })}
            </div>
          )}

          {/* Syntax Highlighted Preview (behind textarea) */}
          <div className="absolute inset-0 py-3 px-4 overflow-auto pointer-events-none">
            <pre className="font-mono text-sm leading-6 whitespace-pre-wrap break-all">
              {lines.map((line, i) => (
                <div key={i}>{highlightLine(line) || ' '}</div>
              ))}
            </pre>
          </div>

          {/* Actual Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            readOnly={readOnly}
            className="absolute inset-0 w-full h-full py-3 px-4 font-mono text-sm leading-6 
                       bg-transparent text-transparent caret-cyan-400 resize-none outline-none
                       selection:bg-cyan-500/30"
            spellCheck={false}
            placeholder="// Enter Y86-64 assembly code here..."
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-cyan-500/30 bg-card/50 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            <span className="text-cyan-400">Y86-64</span> Assembly
          </span>
          <span className="text-muted-foreground">
            UTF-8
          </span>
          {breakpoints.length > 0 && (
            <span className="text-red-400/80">
              {breakpoints.filter(bp => bp.enabled).length} active breakpoints
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-green-400/80 text-glow-green">READY</span>
        </div>
      </div>
    </motion.div>
  );
};

export default CodeEditor;
