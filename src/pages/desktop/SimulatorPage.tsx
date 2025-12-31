import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Github } from 'lucide-react';
import CodeEditor, { SAMPLE_PROGRAM } from '@/components/desktop/CodeEditor';
import ControlPanel from '@/components/desktop/ControlPanel';
import RegisterPanel from '@/components/desktop/RegisterPanel';
import ConditionCodes from '@/components/desktop/ConditionCodes';
import MemoryView from '@/components/desktop/MemoryView';
import Terminal from '@/components/desktop/Terminal';
import BreakpointPanel from '@/components/desktop/BreakpointPanel';
import HistoryPanel from '@/components/desktop/HistoryPanel';
import { AIAssistantPanel } from '@/components/desktop/AIAssistantPanel';
import { Y86CPU, createCPU, MEMORY_SIZE } from '@/lib/y86/cpu';
import { RegisterFile, ConditionCodeFlags, ExecutionLog, Breakpoint, ExecutionSnapshot } from '@/lib/y86/types';
import { toast } from 'sonner';

const SimulatorPage = () => {
  // CPU State
  const cpuRef = useRef<Y86CPU>(createCPU());
  const [code, setCode] = useState(SAMPLE_PROGRAM);
  const [registers, setRegisters] = useState<RegisterFile>(cpuRef.current.getRegisters());
  const [previousRegisters, setPreviousRegisters] = useState<RegisterFile | undefined>();
  const [conditionCodes, setConditionCodes] = useState<ConditionCodeFlags>(cpuRef.current.getConditionCodes());
  const [previousConditionCodes, setPreviousConditionCodes] = useState<ConditionCodeFlags | undefined>();
  const [memory, setMemory] = useState<Uint8Array>(new Uint8Array(MEMORY_SIZE));
  const [previousMemory, setPreviousMemory] = useState<Uint8Array | undefined>();
  const [pc, setPc] = useState(0);
  const [status, setStatus] = useState('AOK');
  const [cycle, setCycle] = useState(0);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const runIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Breakpoint State
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);

  // Execution History State
  const [executionHistory, setExecutionHistory] = useState<ExecutionSnapshot[]>([]);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | undefined>();

  // Update state from CPU
  const syncStateFromCPU = useCallback(() => {
    const cpu = cpuRef.current;
    setPreviousRegisters(registers);
    setRegisters(cpu.getRegisters());
    setPreviousConditionCodes(conditionCodes);
    setConditionCodes(cpu.getConditionCodes());
    setPreviousMemory(memory);
    setMemory(cpu.getMemory());
    setPc(cpu.getPC());
    setStatus(cpu.getStatusName());
    setCycle(cpu.getCycle());
    setLogs(cpu.getLogs());
    setExecutionHistory(cpu.getExecutionHistory());
    
    // Update current snapshot ID
    const history = cpu.getExecutionHistory();
    if (history.length > 0) {
      setCurrentSnapshotId(history[history.length - 1].id);
    }
  }, [registers, conditionCodes, memory]);

  // Load program
  const handleLoad = useCallback(() => {
    const cpu = cpuRef.current;
    cpu.loadProgram(code)
      .then(success => {
        if (!success) {
          toast.error('程序加载失败，请检查 .yo 内容');
          return;
        }
        syncStateFromCPU();
        setIsRunning(false);
        setIsPaused(false);
      })
      .catch(error => {
        toast.error(`程序加载失败: ${(error as Error).message}`);
      });
  }, [code, syncStateFromCPU]);

  // Single step
  const handleStep = useCallback(() => {
    const cpu = cpuRef.current;
    if (cpu.isRunning()) {
      cpu.step();
      syncStateFromCPU();
    }
  }, [syncStateFromCPU]);

  // Run continuously
  const handleRun = useCallback(() => {
    if (!cpuRef.current.isRunning()) return;
    
    setIsRunning(true);
    setIsPaused(false);
    
    runIntervalRef.current = setInterval(() => {
      const cpu = cpuRef.current;
      if (cpu.isRunning()) {
        cpu.step();
        syncStateFromCPU();
      } else {
        if (runIntervalRef.current) {
          clearInterval(runIntervalRef.current);
          runIntervalRef.current = null;
        }
        setIsRunning(false);
      }
    }, 100); // 100ms per step for visualization
  }, [syncStateFromCPU]);

  // Pause execution
  const handlePause = useCallback(() => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    setIsPaused(true);
    setIsRunning(false);
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    cpuRef.current.reset();
    syncStateFromCPU();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentSnapshotId(undefined);
  }, [syncStateFromCPU]);

  // Clear terminal
  const handleClearTerminal = useCallback(() => {
    setLogs([]);
  }, []);

  // Breakpoint management
  const handleBreakpointToggle = useCallback((address: number) => {
    const cpu = cpuRef.current;
    if (cpu.hasBreakpoint(address)) {
      cpu.removeBreakpoint(address);
    } else {
      cpu.addBreakpoint(address);
    }
    setBreakpoints(cpu.getBreakpoints());
  }, []);

  const handleBreakpointRemove = useCallback((address: number) => {
    const cpu = cpuRef.current;
    cpu.removeBreakpoint(address);
    setBreakpoints(cpu.getBreakpoints());
  }, []);

  const handleBreakpointAddConditional = useCallback((address: number, condition: string) => {
    const cpu = cpuRef.current;
    if (cpu.hasBreakpoint(address)) {
      cpu.removeBreakpoint(address);
    }
    cpu.addBreakpoint(address, condition);
    setBreakpoints(cpu.getBreakpoints());
  }, []);

  const handleBreakpointToggleEnabled = useCallback((address: number) => {
    const cpu = cpuRef.current;
    cpu.toggleBreakpoint(address);
    setBreakpoints(cpu.getBreakpoints());
  }, []);

  // Continue from breakpoint
  const handleContinue = useCallback(() => {
    const cpu = cpuRef.current;
    cpu.continueFromBreakpoint();
    syncStateFromCPU();
    if (cpu.isRunning()) {
      handleRun();
    }
  }, [syncStateFromCPU, handleRun]);

  // History management
  const handleJumpToSnapshot = useCallback((snapshotId: string) => {
    const cpu = cpuRef.current;
    const success = cpu.restoreSnapshot(snapshotId);
    if (success) {
      syncStateFromCPU();
      setCurrentSnapshotId(snapshotId);
      toast.success('已跳转到指定快照');
    } else {
      toast.error('跳转失败：快照不存在');
    }
  }, [syncStateFromCPU]);

  const handleCompareSnapshots = useCallback((snapshotId1: string, snapshotId2: string) => {
    const history = executionHistory;
    const snap1 = history.find(s => s.id === snapshotId1);
    const snap2 = history.find(s => s.id === snapshotId2);

    if (!snap1 || !snap2) {
      toast.error('对比失败：快照不存在');
      return;
    }

    // Compare registers
    const registerDiffs: string[] = [];
    Object.keys(snap1.registers).forEach(key => {
      const k = key as keyof RegisterFile;
      if (snap1.registers[k] !== snap2.registers[k]) {
        registerDiffs.push(`${k}: ${snap1.registers[k].toString(16)} → ${snap2.registers[k].toString(16)}`);
      }
    });

    // Compare condition codes
    const ccDiffs: string[] = [];
    if (snap1.conditionCodes.ZF !== snap2.conditionCodes.ZF) ccDiffs.push('ZF');
    if (snap1.conditionCodes.SF !== snap2.conditionCodes.SF) ccDiffs.push('SF');
    if (snap1.conditionCodes.OF !== snap2.conditionCodes.OF) ccDiffs.push('OF');

    // Show comparison results
    const message = `快照对比结果:\n周期: ${snap1.cycle} → ${snap2.cycle}\nPC: 0x${snap1.pc.toString(16)} → 0x${snap2.pc.toString(16)}\n寄存器变化: ${registerDiffs.length > 0 ? registerDiffs.join(', ') : '无'}\n条件码变化: ${ccDiffs.length > 0 ? ccDiffs.join(', ') : '无'}`;
    toast.info(message, { duration: 10000 });
  }, [executionHistory]);

  const handleExportHistory = useCallback(() => {
    const history = executionHistory;
    if (history.length === 0) {
      toast.warning('没有可导出的历史记录');
      return;
    }

    // Convert history to JSON
    const exportData = history.map(snapshot => ({
      cycle: snapshot.cycle,
      pc: '0x' + snapshot.pc.toString(16).padStart(4, '0'),
      instruction: snapshot.instruction,
      stat: snapshot.stat === 1 ? 'AOK' : 'HLT',
      timestamp: new Date(snapshot.timestamp).toISOString(),
      registers: Object.fromEntries(
        Object.entries(snapshot.registers).map(([key, val]) => [
          key,
          '0x' + val.toString(16).padStart(16, '0'),
        ])
      ),
      conditionCodes: snapshot.conditionCodes,
    }));

    // Create download link
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `y86_execution_history_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`已导出 ${history.length} 条执行记录`);
  }, [executionHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        handleRun();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleStep();
      } else if (e.key === 'F6') {
        e.preventDefault();
        handlePause();
      } else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, handleStep, handlePause, handleReset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 border-b border-cyan-500/30 bg-card/30 backdrop-blur-md"
      >
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Cpu className="w-8 h-8 text-cyan-400" />
              <Zap className="w-4 h-4 text-purple-400 absolute -bottom-1 -right-1" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-cyan-400 neon-cyan font-[Orbitron]">
                Y86-64 模拟器
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                顺序 CPU 仿真器
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground px-3 py-1 rounded border border-cyan-500/20 bg-card/50">
              v1.0.0
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-cyan-400 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto p-6 flex flex-col gap-6">
        {/* Top Section: 4-Column Layout */}
        <div className="flex gap-6 min-h-[800px]">
          {/* Column 1: Code Editor + Breakpoints + Controls */}
          <div className="w-[30%] flex flex-col gap-4">
            {/* Code Editor */}
            <div className="h-[600px] border border-cyan-500/30 rounded-lg overflow-hidden bg-card/30 backdrop-blur-sm glow-border-cyan">
              <CodeEditor
                value={code}
                onChange={setCode}
                readOnly={isRunning && !isPaused}
                breakpoints={breakpoints}
                onBreakpointToggle={handleBreakpointToggle}
                currentPC={pc}
              />
            </div>
            
            {/* Breakpoint Panel */}
            <div className="h-52">
              <BreakpointPanel
                breakpoints={breakpoints}
                onToggle={handleBreakpointToggleEnabled}
                onRemove={handleBreakpointRemove}
                onAddConditional={handleBreakpointAddConditional}
              />
            </div>
            
            {/* Control Panel */}
            <ControlPanel
              onLoad={handleLoad}
              onRun={handleRun}
              onStep={handleStep}
              onPause={handlePause}
              onReset={handleReset}
              isRunning={isRunning}
              isPaused={isPaused}
              status={status}
              cycle={cycle}
              pc={pc}
            />
          </div>

          {/* Column 2: CPU State (Registers + Condition Codes) */}
          <div className="w-[25%] flex flex-col gap-4">
            {/* Registers */}
            <RegisterPanel
              registers={registers}
              previousRegisters={previousRegisters}
            />
            
            {/* Condition Codes */}
            <ConditionCodes
              flags={conditionCodes}
              previousFlags={previousConditionCodes}
            />
          </div>

          {/* Column 3: Execution History */}
          <div className="w-[22.5%] h-full">
            <HistoryPanel
              history={executionHistory}
              onJumpToSnapshot={handleJumpToSnapshot}
              onCompareSnapshots={handleCompareSnapshots}
              onExportHistory={handleExportHistory}
              currentSnapshotId={currentSnapshotId}
            />
          </div>

          {/* Column 4: AI Assistant */}
          <div className="w-[22.5%] h-full">
            <AIAssistantPanel currentCode={code} />
          </div>
        </div>

        {/* Middle Row: Memory View */}
        <div className="min-h-[400px]">
          <MemoryView
            memory={memory}
            previousMemory={previousMemory}
            pc={pc}
          />
        </div>

        {/* Bottom: Terminal Output */}
        <div className="min-h-[300px]">
          <Terminal logs={logs} onClear={handleClearTerminal} />
        </div>
      </main>
    </div>
  );
};

export default SimulatorPage;
