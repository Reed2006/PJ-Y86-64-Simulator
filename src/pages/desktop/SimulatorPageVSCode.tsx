import { useState, useCallback, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { TOAST_MESSAGES, generateComparisonMessage } from '@/lib/constants';
import FileExplorer from '@/components/desktop/FileExplorer';
import CodeEditor from '@/components/desktop/CodeEditor';
import MonacoCodeEditor from '@/components/desktop/MonacoCodeEditor';
import ControlPanel from '@/components/desktop/ControlPanel';
import ControlToolbar from '@/components/desktop/ControlToolbar';
import Terminal from '@/components/desktop/Terminal';
import BreakpointPanel from '@/components/desktop/BreakpointPanel';
import HistoryPanel from '@/components/desktop/HistoryPanel';
import CPUDashboard from '@/components/desktop/CPUDashboard';
import StatusBar from '@/components/desktop/StatusBar';
import { AIAssistantPanel } from '@/components/desktop/AIAssistantPanel';
import { Y86CPU, createCPU, MEMORY_SIZE } from '@/lib/y86/cpu';
import { RegisterFile, ConditionCodeFlags, ExecutionLog, Breakpoint, ExecutionSnapshot } from '@/lib/y86/types';

const SimulatorPageVSCode = () => {
  // CPU State
  const cpuRef = useRef<Y86CPU>(createCPU());
  const [code, setCode] = useState('');
  const [currentFileName, setCurrentFileName] = useState<string>();
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
    
    const history = cpu.getExecutionHistory();
    if (history.length > 0) {
      setCurrentSnapshotId(history[history.length - 1].id);
    }
  }, [registers, conditionCodes, memory]);

  // File selection handler
  const handleFileSelect = useCallback((content: string, fileName: string) => {
    setCode(content);
    setCurrentFileName(fileName);
    const cpu = cpuRef.current;
    cpu.loadProgram(content)
      .then(success => {
        if (!success) {
          toast.error('程序加载失败，请检查 .yo 内容');
          return;
        }
        syncStateFromCPU();
        setIsRunning(cpu.isRunning());
        setIsPaused(false);
      })
      .catch(error => {
        toast.error(`程序加载失败: ${(error as Error).message}`);
      });
  }, [syncStateFromCPU]);

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
        setIsRunning(cpu.isRunning());
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
    }, 100);
  }, [syncStateFromCPU]);

  // Pause execution
  const handlePause = useCallback(() => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    setIsPaused(true);
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
      toast.success(TOAST_MESSAGES.SNAPSHOT_JUMPED);
    } else {
      toast.error(TOAST_MESSAGES.JUMP_FAILED);
    }
  }, [syncStateFromCPU]);

  const handleCompareSnapshots = useCallback((snapshotId1: string, snapshotId2: string) => {
    const history = executionHistory;
    const snap1 = history.find(s => s.id === snapshotId1);
    const snap2 = history.find(s => s.id === snapshotId2);

    if (!snap1 || !snap2) {
      toast.error(TOAST_MESSAGES.JUMP_FAILED);
      return;
    }

    const registerDiffs: string[] = [];
    Object.keys(snap1.registers).forEach(key => {
      const k = key as keyof RegisterFile;
      if (snap1.registers[k] !== snap2.registers[k]) {
        registerDiffs.push(`${k}: ${snap1.registers[k].toString(16)} → ${snap2.registers[k].toString(16)}`);
      }
    });

    const ccDiffs: string[] = [];
    if (snap1.conditionCodes.ZF !== snap2.conditionCodes.ZF) ccDiffs.push('ZF');
    if (snap1.conditionCodes.SF !== snap2.conditionCodes.SF) ccDiffs.push('SF');
    if (snap1.conditionCodes.OF !== snap2.conditionCodes.OF) ccDiffs.push('OF');

    const message = generateComparisonMessage(snap1, snap2, registerDiffs, ccDiffs);
    toast.info(message, { duration: 10000 });
  }, [executionHistory]);

  const handleExportHistory = useCallback(() => {
    const history = executionHistory;
    if (history.length === 0) {
      toast.warning(TOAST_MESSAGES.NO_HISTORY);
      return;
    }

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

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `y86_execution_history_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(TOAST_MESSAGES.HISTORY_EXPORTED(history.length));
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#1e1e1e]">
      {/* Main IDE Layout */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Sidebar: File Explorer */}
          <Panel defaultSize={15} minSize={10} maxSize={25} collapsible>
            <FileExplorer 
              onFileSelect={handleFileSelect}
              currentFileName={currentFileName}
            />
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-border hover:bg-cyan-500 transition-colors" />

          {/* Center: Editor + Bottom Panel */}
          <Panel defaultSize={45}>
            <PanelGroup direction="vertical">
              {/* Top: Control Toolbar + Editor */}
              <Panel defaultSize={70} minSize={30}>
                <div className="h-full flex flex-col">
                  {/* Control Toolbar */}
                  <ControlToolbar
                    onLoad={handleLoad}
                    onRun={handleRun}
                    onStep={handleStep}
                    onPause={handlePause}
                    onReset={handleReset}
                    onContinue={handleContinue}
                    isRunning={isRunning}
                    isPaused={isPaused}
                    status={status}
                  />
                  
                  {/* Editor */}
                  <div className="flex-1 overflow-hidden">
                    <MonacoCodeEditor 
                      value={code}
                      onChange={setCode}
                      breakpoints={breakpoints}
                      onBreakpointToggle={handleBreakpointToggle}
                      currentPC={pc}
                    />
                  </div>
                </div>
              </Panel>

              {/* Bottom: Collapsible Panel with Tabs (Terminal, Breakpoints, Output) */}
              <PanelResizeHandle className="h-[1px] bg-border hover:bg-cyan-500 transition-colors" />
              <Panel defaultSize={30} minSize={20} maxSize={50} collapsible>
                <div className="h-full flex flex-col bg-[#1e1e1e]">
                  <Tabs defaultValue="terminal" className="flex-1 flex flex-col">
                    <TabsList className="h-9 bg-[#252526] border-b border-border rounded-none justify-start">
                      <TabsTrigger 
                        value="terminal" 
                        className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none"
                      >
                        终端
                      </TabsTrigger>
                      <TabsTrigger 
                        value="breakpoints" 
                        className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none"
                      >
                        断点
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="terminal" className="flex-1 m-0 overflow-hidden">
                      <Terminal 
                        logs={logs}
                        onClear={handleClearTerminal}
                      />
                    </TabsContent>

                    <TabsContent value="breakpoints" className="flex-1 m-0 overflow-hidden">
                      <div className="h-full overflow-y-auto">
                        <BreakpointPanel
                          breakpoints={breakpoints}
                          onRemove={handleBreakpointRemove}
                          onToggleEnabled={handleBreakpointToggleEnabled}
                          onAddConditional={handleBreakpointAddConditional}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-border hover:bg-cyan-500 transition-colors" />

          {/* Right Side: CPU Dashboard */}
          <Panel defaultSize={25} minSize={20} maxSize={35}>
            <CPUDashboard
              registers={registers}
              previousRegisters={previousRegisters}
              conditionCodes={conditionCodes}
              previousConditionCodes={previousConditionCodes}
              memory={memory}
              previousMemory={previousMemory}
              pc={pc}
            />
          </Panel>

          <PanelResizeHandle className="w-[1px] bg-border hover:bg-cyan-500 transition-colors" />

          {/* Far Right: History + AI Assistant */}
          <Panel defaultSize={15} minSize={12} maxSize={25} collapsible>
            <PanelGroup direction="vertical">
              <Panel defaultSize={60}>
                <HistoryPanel
                  history={executionHistory}
                  currentSnapshotId={currentSnapshotId}
                  onJumpToSnapshot={handleJumpToSnapshot}
                  onCompareSnapshots={handleCompareSnapshots}
                  onExportHistory={handleExportHistory}
                />
              </Panel>
              <PanelResizeHandle className="h-[1px] bg-border hover:bg-cyan-500 transition-colors" />
              <Panel defaultSize={40}>
                <AIAssistantPanel currentCode={code} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar 
        status={status}
        cycle={cycle}
        pc={pc}
        fileName={currentFileName}
      />
    </div>
  );
};

export default SimulatorPageVSCode;
