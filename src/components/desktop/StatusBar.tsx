import { Cpu, Zap, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  status: string;
  cycle: number;
  pc: number;
  fileName?: string;
}

const StatusBar = ({ status, cycle, pc, fileName }: StatusBarProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'AOK':
        return 'text-green-400';
      case 'HLT':
        return 'text-yellow-400';
      case 'ADR':
      case 'INS':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-xs text-white">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-semibold">Y86-64 Simulator</span>
        </div>
        
        {fileName && (
          <div className="flex items-center gap-1.5 text-white/80">
            <span>•</span>
            <span>{fileName}</span>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          <span className={cn('font-medium', getStatusColor())}>{status}</span>
        </div>

        <div className="flex items-center gap-1.5 text-white/80">
          <Clock className="w-3.5 h-3.5" />
          <span>週期: {cycle}</span>
        </div>

        <div className="flex items-center gap-1.5 text-white/80">
          <Zap className="w-3.5 h-3.5" />
          <span>PC: 0x{pc.toString(16).toUpperCase().padStart(3, '0')}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
