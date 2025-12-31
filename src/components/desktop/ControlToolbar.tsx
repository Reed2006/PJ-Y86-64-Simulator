import { Play, Square, StepForward, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CPUStatus } from '@/lib/y86/types';
import { BUTTON_LABELS } from '@/lib/constants';

interface ControlToolbarProps {
  onLoad: () => void;
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onReset: () => void;
  onContinue: () => void;
  isRunning: boolean;
  isPaused: boolean;
  status: CPUStatus;
}

const ControlToolbar = ({
  onLoad,
  onRun,
  onStep,
  onPause,
  onReset,
  onContinue,
  isRunning,
  isPaused,
  status
}: ControlToolbarProps) => {
  return (
    <div className="h-10 bg-[#252526] border-b border-border flex items-center gap-2 px-4">
      {/* 主要控制按钮 */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-cyan-500/20"
              onClick={onRun}
              disabled={isRunning || status === 'HLT'}
            >
              <Play className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{BUTTON_LABELS.RUN} (F5)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-cyan-500/20"
              onClick={onStep}
              disabled={isRunning || status === 'HLT'}
            >
              <StepForward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{BUTTON_LABELS.STEP} (F10)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-cyan-500/20"
              onClick={onPause}
              disabled={!isRunning}
            >
              <Pause className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{BUTTON_LABELS.PAUSE} (F6)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-cyan-500/20"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{BUTTON_LABELS.RESET} (Ctrl+R)</p>
          </TooltipContent>
        </Tooltip>

        {isPaused && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-purple-500/20"
                onClick={onContinue}
              >
                <SkipForward className="h-4 w-4 text-purple-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{BUTTON_LABELS.CONTINUE}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 分隔线 */}
      <div className="w-[1px] h-6 bg-border" />

      {/* 状态指示 */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">状态:</span>
          <span className={`font-mono font-semibold ${
            status === 'AOK' ? 'text-cyan-400' : 
            status === 'HLT' ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ControlToolbar;
