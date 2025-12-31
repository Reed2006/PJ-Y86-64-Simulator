import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MemoryViewProps {
  memory: Uint8Array;
  previousMemory?: Uint8Array;
  pc?: number;
}

const BYTES_PER_ROW = 16;
const VISIBLE_ROWS = 12;

const MemoryView = ({ memory, previousMemory, pc = 0 }: MemoryViewProps) => {
  const [startAddress, setStartAddress] = useState(0);
  const [searchAddress, setSearchAddress] = useState('');
  const [changedAddresses, setChangedAddresses] = useState<Set<number>>(new Set());

  // Track changed memory addresses
  useEffect(() => {
    if (previousMemory) {
      const changed = new Set<number>();
      for (let i = 0; i < memory.length; i++) {
        if (memory[i] !== previousMemory[i]) {
          changed.add(i);
        }
      }
      setChangedAddresses(changed);
      
      // Clear highlights after animation
      const timer = setTimeout(() => setChangedAddresses(new Set()), 500);
      return () => clearTimeout(timer);
    }
  }, [memory, previousMemory]);

  // Find non-zero memory regions
  const memoryRegions = useMemo(() => {
    const regions: { start: number; end: number }[] = [];
    let inRegion = false;
    let regionStart = 0;

    for (let i = 0; i < memory.length; i++) {
      if (memory[i] !== 0) {
        if (!inRegion) {
          regionStart = Math.floor(i / BYTES_PER_ROW) * BYTES_PER_ROW;
          inRegion = true;
        }
      } else if (inRegion) {
        regions.push({ start: regionStart, end: i });
        inRegion = false;
      }
    }
    
    if (inRegion) {
      regions.push({ start: regionStart, end: memory.length });
    }

    return regions;
  }, [memory]);

  const handleSearch = () => {
    const addr = parseInt(searchAddress, 16);
    if (!isNaN(addr) && addr >= 0 && addr < memory.length) {
      setStartAddress(Math.floor(addr / BYTES_PER_ROW) * BYTES_PER_ROW);
    }
  };

  const handleScroll = (direction: 'up' | 'down') => {
    const newAddress = direction === 'up'
      ? Math.max(0, startAddress - BYTES_PER_ROW * 4)
      : Math.min(memory.length - BYTES_PER_ROW * VISIBLE_ROWS, startAddress + BYTES_PER_ROW * 4);
    setStartAddress(newAddress);
  };

  const renderRow = (rowAddress: number) => {
    const bytes: JSX.Element[] = [];
    const ascii: string[] = [];

    for (let i = 0; i < BYTES_PER_ROW; i++) {
      const addr = rowAddress + i;
      const value = memory[addr] || 0;
      const isChanged = changedAddresses.has(addr);
      const isPcLocation = addr >= pc && addr < pc + 10;

      bytes.push(
        <span
          key={`byte-${addr}`}
          className={cn(
            'font-mono text-xs px-0.5 transition-all duration-200',
            value === 0 ? 'text-muted-foreground/30' : 'text-cyan-300',
            isChanged && 'text-cyan-400 bg-cyan-400/20 neon-cyan rounded',
            isPcLocation && 'bg-purple-500/20 text-purple-300',
            i === 7 && 'mr-2' // Extra space after 8 bytes
          )}
        >
          {value.toString(16).padStart(2, '0').toUpperCase()}
        </span>
      );

      // ASCII representation
      const char = value >= 32 && value <= 126 ? String.fromCharCode(value) : '.';
      ascii.push(char);
    }

    return (
      <div
        key={`row-${rowAddress}`}
        className={cn(
          'flex items-center gap-2 py-0.5 px-2 hover:bg-cyan-500/5 transition-colors',
          rowAddress === Math.floor(pc / BYTES_PER_ROW) * BYTES_PER_ROW && 'bg-purple-500/10'
        )}
      >
        {/* Address */}
        <span className="font-mono text-xs text-purple-400 w-12 flex-shrink-0">
          {rowAddress.toString(16).padStart(4, '0').toUpperCase()}
        </span>
        
        {/* Hex bytes */}
        <div className="flex gap-1 flex-shrink-0">
          {bytes}
        </div>
        
        {/* ASCII */}
        <span className="font-mono text-xs text-green-400/60 flex-shrink-0 border-l border-cyan-500/20 pl-2">
          {ascii.join('')}
        </span>
      </div>
    );
  };

  const rows: JSX.Element[] = [];
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    const rowAddr = startAddress + i * BYTES_PER_ROW;
    if (rowAddr < memory.length) {
      rows.push(renderRow(rowAddr));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="border border-cyan-500/30 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-400 tracking-wider uppercase">
            内存视图
          </span>
          <span className="text-xs text-muted-foreground">
            ({memory.length} 字节)
          </span>
        </div>
        
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              0x
            </span>
            <Input
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="0000"
              className="w-24 h-7 pl-6 text-xs font-mono bg-card/50 border-cyan-500/30"
            />
          </div>
          <Button
            onClick={handleSearch}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-cyan-500/20"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center gap-2 px-4 py-1 border-b border-cyan-500/20 bg-card/30 text-[10px] text-muted-foreground">
        <span className="w-12">地址</span>
        <div className="flex gap-1">
          {Array.from({ length: BYTES_PER_ROW }, (_, i) => (
            <span key={i} className={cn('w-5 text-center', i === 7 && 'mr-2')}>
              {i.toString(16).toUpperCase()}
            </span>
          ))}
        </div>
        <span className="border-l border-cyan-500/20 pl-2">字符</span>
      </div>

      {/* Memory Content */}
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none scanlines opacity-20" />
          {rows}
        </div>
      </ScrollArea>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-cyan-500/20">
        <div className="flex items-center gap-1">
          <Button
            onClick={() => handleScroll('up')}
            disabled={startAddress === 0}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-cyan-500/20"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleScroll('down')}
            disabled={startAddress >= memory.length - BYTES_PER_ROW * VISIBLE_ROWS}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-cyan-500/20"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {memoryRegions.length > 0 && (
            <span>
              {memoryRegions.length} 个活动区域
            </span>
          )}
          <span className="font-mono text-cyan-400/60">
            0x{startAddress.toString(16).padStart(4, '0')}-
            0x{Math.min(startAddress + BYTES_PER_ROW * VISIBLE_ROWS - 1, memory.length - 1).toString(16).padStart(4, '0')}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default MemoryView;
