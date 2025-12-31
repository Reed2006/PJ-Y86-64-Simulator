import {
  CPUState,
  RegisterFile,
  ConditionCodeFlags,
  StatusCode,
  ExecutionLog,
  SimulatorSnapshot,
  Breakpoint,
  BreakpointHit,
  ExecutionSnapshot,
  Instruction,
  ALUOp,
  ConditionCode,
  REGISTER_NAMES,
} from './types';

export const MEMORY_SIZE = 0x8000;
const MAX_SIMULATION_STEPS = 10000;

interface RemoteCycle {
  CC: Record<'OF' | 'SF' | 'ZF', number | string>;
  MEM: Record<string, number | string>;
  PC: number;
  REG: Record<string, number | string>;
  STAT: number;
}

const STATUS_MAP: Record<number, StatusCode> = {
  1: StatusCode.AOK,
  2: StatusCode.HLT,
  3: StatusCode.ADR,
  4: StatusCode.INS,
};

const REGISTER_KEYS: Array<keyof RegisterFile> = [
  'rax', 'rcx', 'rdx', 'rbx', 'rsp', 'rbp', 'rsi', 'rdi',
  'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14',
];

export class Y86CPU {
  private state: CPUState = this.createInitialState();
  private logs: ExecutionLog[] = [];
  private history: SimulatorSnapshot[] = [];
  private executionHistory: ExecutionSnapshot[] = [];
  private breakpoints: Map<number, Breakpoint> = new Map();
  private lastBreakpointHit: BreakpointHit | null = null;
  private trace: RemoteCycle[] = [];
  private currentIndex = -1;
  private running = false;
  private statBeforeBreakpoint: StatusCode | null = null;

  private createInitialState(): CPUState {
    return {
      pc: 0,
      stat: StatusCode.AOK,
      registers: {
        rax: 0n, rcx: 0n, rdx: 0n, rbx: 0n,
        rsp: BigInt(MEMORY_SIZE), rbp: 0n, rsi: 0n, rdi: 0n,
        r8: 0n, r9: 0n, r10: 0n, r11: 0n,
        r12: 0n, r13: 0n, r14: 0n,
      },
      conditionCodes: { ZF: true, SF: false, OF: false },
      memory: new Uint8Array(MEMORY_SIZE),
      cycle: 0,
    };
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.logs = [];
    this.history = [];
    this.executionHistory = [];
    this.trace = [];
    this.currentIndex = -1;
    this.running = false;
    this.statBeforeBreakpoint = null;
    this.lastBreakpointHit = null;
    this.log('info', 'CPU Reset - 清空寄存器和内存');
  }

  public async loadProgram(yoContent: string): Promise<boolean> {
    this.reset();

    try {
      const trace = await this.runRemoteProgram(yoContent);
      if (!Array.isArray(trace) || trace.length === 0) {
        this.log('warning', '远程 CPU 没有返回任何执行结果');
        return false;
      }

      const needsReverse =
        trace.length > 1 &&
        trace[0]?.STAT !== StatusCode.AOK &&
        trace[trace.length - 1]?.STAT === StatusCode.AOK;

      this.trace = needsReverse ? [...trace].reverse() : trace;
      this.currentIndex = 0;
      this.applyRemoteState(this.trace[0], 0);
      this.running = this.trace.length > 1;
      this.log(
        'success',
        `程序已在浏览器 CPU 中模拟完成，记录 ${this.trace.length} 条执行状态${needsReverse ? '（顺序已调整）' : ''}`
      );
      this.saveSnapshot();
      this.captureSnapshot();
      return true;
    } catch (error) {
      this.log('error', `CPU 执行失败: ${(error as Error).message}`);
      return false;
    }
  }

  private async runRemoteProgram(yoContent: string): Promise<RemoteCycle[]> {
    return simulateYoProgram(yoContent);
  }

  private hasNextStep(): boolean {
    return this.trace.length > 0 && this.currentIndex < this.trace.length - 1;
  }

  public step(): boolean {
    if (!this.hasNextStep()) {
      this.running = false;
      return false;
    }

    const nextIndex = this.currentIndex + 1;

    this.applyRemoteState(this.trace[nextIndex], nextIndex);
    this.currentIndex = nextIndex;
    this.saveSnapshot();
    this.captureSnapshot();
    this.log('info', `第 ${this.state.cycle} 周期：PC=0x${this.state.pc.toString(16).padStart(4, '0')}`);

    const status = STATUS_MAP[this.trace[nextIndex].STAT] ?? StatusCode.AOK;
    this.running = status === StatusCode.AOK && this.hasNextStep();

    const breakpointHit = this.checkBreakpoint(this.state.pc);
    if (breakpointHit) {
      this.lastBreakpointHit = breakpointHit;
      this.statBeforeBreakpoint = this.state.stat;
      this.state.stat = StatusCode.HLT;
      this.running = false;
      this.log('warning', `命中断点，地址 0x${this.state.pc.toString(16).padStart(4, '0')}`);
    }

    return this.running;
  }

  private applyRemoteState(entry: RemoteCycle, cycleIndex: number): void {
    const previousMemory = this.state.memory;
    this.state = {
      pc: entry.PC ?? 0,
      stat: STATUS_MAP[entry.STAT] ?? StatusCode.AOK,
      registers: this.convertRegisters(entry.REG),
      conditionCodes: this.convertFlags(entry.CC),
      memory: this.convertMemory(entry.MEM, previousMemory),
      cycle: cycleIndex,
    };
  }

  private convertRegisters(regData: RemoteCycle['REG']): RegisterFile {
    const registers: RegisterFile = {
      rax: 0n, rcx: 0n, rdx: 0n, rbx: 0n,
      rsp: 0n, rbp: 0n, rsi: 0n, rdi: 0n,
      r8: 0n, r9: 0n, r10: 0n, r11: 0n,
      r12: 0n, r13: 0n, r14: 0n,
    };

    if (!regData) {
      return registers;
    }

    Object.entries(regData).forEach(([key, value]) => {
      if (REGISTER_KEYS.includes(key as keyof RegisterFile)) {
        registers[key as keyof RegisterFile] = this.toBigInt(value);
      }
    });

    return registers;
  }

  private convertFlags(cc: RemoteCycle['CC']): ConditionCodeFlags {
    return {
      ZF: this.toNumber(cc?.ZF) === 1,
      SF: this.toNumber(cc?.SF) === 1,
      OF: this.toNumber(cc?.OF) === 1,
    };
  }

  private convertMemory(memData: RemoteCycle['MEM'], previousMemory?: Uint8Array): Uint8Array {
    const memory = previousMemory ? new Uint8Array(previousMemory) : new Uint8Array(MEMORY_SIZE);
    if (!memData) {
      return memory;
    }

    Object.entries(memData).forEach(([addressStr, value]) => {
      const address = Number(addressStr);
      if (Number.isNaN(address) || address < 0 || address >= MEMORY_SIZE) {
        return;
      }
      const word = this.toBigInt(value);
      for (let i = 0; i < 8 && address + i < MEMORY_SIZE; i++) {
        memory[address + i] = Number((word >> BigInt(i * 8)) & 0xFFn);
      }
    });

    return memory;
  }

  private toBigInt(value: number | string | bigint | undefined): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') return BigInt(value);
    return 0n;
  }

  private toNumber(value: number | string | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
  }

  public getState(): CPUState {
    return { ...this.state, registers: { ...this.state.registers }, conditionCodes: { ...this.state.conditionCodes }, memory: new Uint8Array(this.state.memory) };
  }

  public getLogs(): ExecutionLog[] {
    return [...this.logs];
  }

  public getHistory(): SimulatorSnapshot[] {
    return [...this.history];
  }

  public getExecutionHistory(): ExecutionSnapshot[] {
    return [...this.executionHistory];
  }

  public getSnapshot(): SimulatorSnapshot | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  public getPC(): number {
    return this.state.pc;
  }

  public getStatus(): StatusCode {
    return this.state.stat;
  }

  public getStatusName(): string {
    const names = { 1: 'AOK', 2: 'HLT', 3: 'ADR', 4: 'INS' };
    return names[this.state.stat] || 'UNKNOWN';
  }

  public getCycle(): number {
    return this.state.cycle;
  }

  public getRegisters(): RegisterFile {
    return { ...this.state.registers };
  }

  public getConditionCodes(): ConditionCodeFlags {
    return { ...this.state.conditionCodes };
  }

  public getMemory(): Uint8Array {
    return new Uint8Array(this.state.memory);
  }

  public isRunning(): boolean {
    return this.running;
  }

  public continueFromBreakpoint(): void {
    if (this.lastBreakpointHit && this.statBeforeBreakpoint !== null) {
      this.state.stat = this.statBeforeBreakpoint;
      this.running = this.state.stat === StatusCode.AOK && this.hasNextStep();
      this.lastBreakpointHit = null;
      this.statBeforeBreakpoint = null;
      this.log('info', '断点继续执行');
    }
  }

  // Breakpoint APIs
  public addBreakpoint(address: number, condition?: string): Breakpoint {
    const id = `bp_${address}_${Date.now()}`;
    const breakpoint: Breakpoint = {
      id,
      address,
      enabled: true,
      condition,
      hitCount: 0,
    };
    this.breakpoints.set(address, breakpoint);
    this.log('info', `添加断点：0x${address.toString(16).padStart(4, '0')}`);
    return breakpoint;
  }

  public removeBreakpoint(address: number): boolean {
    const removed = this.breakpoints.delete(address);
    if (removed) {
      this.log('info', `移除断点：0x${address.toString(16).padStart(4, '0')}`);
    }
    return removed;
  }

  public toggleBreakpoint(address: number): boolean {
    const bp = this.breakpoints.get(address);
    if (bp) {
      bp.enabled = !bp.enabled;
      this.log('info', `断点 0x${address.toString(16).padStart(4, '0')} ${bp.enabled ? '启用' : '禁用'}`);
      return bp.enabled;
    }
    return false;
  }

  public getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  public hasBreakpoint(address: number): boolean {
    return this.breakpoints.has(address);
  }

  public clearAllBreakpoints(): void {
    this.breakpoints.clear();
    this.log('info', '清除所有断点');
  }

  private checkBreakpoint(address: number): BreakpointHit | null {
    const bp = this.breakpoints.get(address);
    if (!bp || !bp.enabled) {
      return null;
    }

    if (bp.condition && !this.evaluateBreakpointCondition(bp.condition)) {
      return null;
    }

    bp.hitCount++;
    return {
      breakpoint: bp,
      cycle: this.state.cycle,
      pc: address,
    };
  }

  private evaluateBreakpointCondition(condition: string): boolean {
    try {
      const match = condition.match(/^(rax|rcx|rdx|rbx|rsp|rbp|rsi|rdi|r8|r9|r10|r11|r12|r13|r14)\s*(==|!=|>|<|>=|<=)\s*(-?\d+)$/);
      if (!match) {
        this.log('warning', `断点条件无效: ${condition}`);
        return false;
      }

      const regName = match[1] as keyof RegisterFile;
      const operator = match[2];
      const targetValue = BigInt(match[3]);
      const currentValue = this.state.registers[regName];

      switch (operator) {
        case '==':
          return currentValue === targetValue;
        case '!=':
          return currentValue !== targetValue;
        case '>':
          return currentValue > targetValue;
        case '<':
          return currentValue < targetValue;
        case '>=':
          return currentValue >= targetValue;
        case '<=':
          return currentValue <= targetValue;
        default:
          return false;
      }
    } catch (error) {
      this.log('error', `解析断点条件出错: ${condition}`);
      return false;
    }
  }

  public getLastBreakpointHit(): BreakpointHit | null {
    return this.lastBreakpointHit;
  }

  public restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.executionHistory.find(s => s.id === snapshotId);
    if (!snapshot) {
      this.log('error', `未找到快照 ${snapshotId}`);
      return false;
    }

    this.state = {
      pc: snapshot.pc,
      stat: snapshot.stat,
      registers: { ...snapshot.registers },
      conditionCodes: { ...snapshot.conditionCodes },
      memory: new Uint8Array(snapshot.memory),
      cycle: snapshot.cycle,
    };
    this.currentIndex = snapshot.cycle;
    this.running = this.state.stat === StatusCode.AOK && this.currentIndex < this.trace.length - 1;
    this.log('info', `恢复到周期 ${snapshot.cycle}`);
    return true;
  }

  private saveSnapshot(): void {
    const snapshot: SimulatorSnapshot = {
      pc: this.state.pc,
      stat: this.state.stat,
      registers: Object.fromEntries(
        Object.entries(this.state.registers).map(([key, val]) => [
          key,
          '0x' + (val < 0n ? (val + 0x10000000000000000n).toString(16) : val.toString(16)).padStart(16, '0'),
        ])
      ),
      conditionCodes: { ...this.state.conditionCodes },
      memory: {},
      cycle: this.state.cycle,
    };

    for (let i = 0; i < MEMORY_SIZE; i += 8) {
      let hasData = false;
      for (let j = 0; j < 8; j++) {
        if (this.state.memory[i + j] !== 0) {
          hasData = true;
          break;
        }
      }
      if (hasData) {
        let val = 0n;
        for (let j = 0; j < 8; j++) {
          val |= BigInt(this.state.memory[i + j]) << BigInt(j * 8);
        }
        snapshot.memory[i] = '0x' + val.toString(16).padStart(16, '0');
      }
    }

    this.history.push(snapshot);
  }

  private captureSnapshot(): void {
    const id = `snapshot_${this.state.cycle}_${Date.now()}`;
    const snapshot: ExecutionSnapshot = {
      id,
      timestamp: Date.now(),
      cycle: this.state.cycle,
      pc: this.state.pc,
      stat: this.state.stat,
      registers: { ...this.state.registers },
      conditionCodes: { ...this.state.conditionCodes },
      memory: new Uint8Array(this.state.memory),
      instruction: `PC=0x${this.state.pc.toString(16).padStart(4, '0')}`,
    };
    this.executionHistory.push(snapshot);
  }

  private log(type: ExecutionLog['type'], message: string): void {
    this.logs.push({
      timestamp: Date.now(),
      cycle: this.state.cycle,
      message,
      type,
    });
  }
}

export const createCPU = (): Y86CPU => new Y86CPU();

interface SimulationState {
  pc: number;
  stat: StatusCode;
  registers: RegisterFile;
  conditionCodes: ConditionCodeFlags;
  memory: Uint8Array;
}

interface ParsedProgram {
  memory: Uint8Array;
  entryPoint: number;
  dirtyWords: Set<number>;
}

class Y86RuntimeError extends Error {
  constructor(message: string, public status: StatusCode) {
    super(message);
  }
}

const createRegisterFile = (): RegisterFile => ({
  rax: 0n, rcx: 0n, rdx: 0n, rbx: 0n,
  rsp: BigInt(MEMORY_SIZE),
  rbp: 0n, rsi: 0n, rdi: 0n,
  r8: 0n, r9: 0n, r10: 0n, r11: 0n,
  r12: 0n, r13: 0n, r14: 0n,
});

const simulateYoProgram = (yoContent: string): RemoteCycle[] => {
  const { memory, entryPoint, dirtyWords } = parseYoProgram(yoContent);
  const registers = createRegisterFile();
  const conditionCodes: ConditionCodeFlags = { ZF: false, SF: false, OF: false };
  const state: SimulationState = {
    pc: entryPoint,
    stat: StatusCode.AOK,
    registers,
    conditionCodes,
    memory,
  };

  const trace: RemoteCycle[] = [];
  trace.push(serializeState(state, new Set(dirtyWords)));

  const dirty = new Set<number>();
  let steps = 0;

  while (steps < MAX_SIMULATION_STEPS && state.stat === StatusCode.AOK) {
    try {
      executeInstruction(state, dirty);
    } catch (error) {
      if (error instanceof Y86RuntimeError) {
        state.stat = error.status;
      } else {
        state.stat = StatusCode.INS;
      }
    }

    steps++;
    trace.push(serializeState(state, new Set(dirty)));
    dirty.clear();
  }

  if (state.stat === StatusCode.AOK) {
    state.stat = StatusCode.HLT;
    trace.push(serializeState(state, new Set()));
  }

  return trace;
};

const parseYoProgram = (content: string): ParsedProgram => {
  const memory = new Uint8Array(MEMORY_SIZE);
  const dirtyWords = new Set<number>();
  let entryPoint: number | null = null;

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const withoutComment = rawLine.split('#')[0] ?? '';
    const [codePart] = withoutComment.split('|');
    const line = codePart?.trim();
    if (!line) continue;

    const match = line.match(/^0x([0-9a-fA-F]+):\s*([0-9a-fA-F]+)/);
    if (!match) continue;

    const address = parseInt(match[1], 16);
    if (Number.isNaN(address) || address < 0 || address >= MEMORY_SIZE) {
      throw new Y86RuntimeError(`程序地址越界: 0x${match[1]}`, StatusCode.ADR);
    }

    const bytes = match[2].replace(/\s+/g, '');
    for (let i = 0; i < bytes.length; i += 2) {
      const byteStr = bytes.slice(i, i + 2);
      if (!byteStr) continue;

      const value = parseInt(byteStr, 16);
      if (Number.isNaN(value)) continue;

      const target = address + (i / 2);
      if (target < 0 || target >= MEMORY_SIZE) {
        throw new Y86RuntimeError(`程序超出内存范围: 0x${target.toString(16)}`, StatusCode.ADR);
      }
      memory[target] = value;
      markMemoryRangeDirty(dirtyWords, target, 1);
    }

    entryPoint = entryPoint === null ? address : Math.min(entryPoint, address);
  }

  return {
    memory,
    entryPoint: entryPoint ?? 0,
    dirtyWords,
  };
};

const executeInstruction = (state: SimulationState, dirtyWords: Set<number>): void => {
  const pc = state.pc;
  if (pc < 0 || pc >= MEMORY_SIZE) {
    throw new Y86RuntimeError(`PC 越界: 0x${pc.toString(16)}`, StatusCode.ADR);
  }

  const opcode = state.memory[pc];
  const icode = (opcode >> 4) & 0xf;
  const ifun = opcode & 0xf;

  switch (icode) {
    case Instruction.HALT:
      state.stat = StatusCode.HLT;
      state.pc = pc + 1;
      break;
    case Instruction.NOP:
      state.pc = pc + 1;
      break;
    case Instruction.RRMOVQ: {
      const regByte = readByte(state.memory, pc + 1);
      const { rA, rB } = decodeRegisters(regByte);
      const src = getRegisterName(rA);
      const dst = getRegisterName(rB);
      if (!src || !dst) throw new Y86RuntimeError('寄存器编码无效', StatusCode.INS);
      if (ifun === ConditionCode.YES || evaluateCondition(ifun, state.conditionCodes)) {
        state.registers[dst] = state.registers[src];
      }
      state.pc = pc + 2;
      break;
    }
    case Instruction.IRMOVQ: {
      const regByte = readByte(state.memory, pc + 1);
      const { rB } = decodeRegisters(regByte);
      const dst = getRegisterName(rB);
      if (!dst) throw new Y86RuntimeError('寄存器编码无效', StatusCode.INS);
      const immediate = readSignedQuad(state.memory, pc + 2);
      state.registers[dst] = normalize64(immediate);
      state.pc = pc + 10;
      break;
    }
    case Instruction.RMMOVQ: {
      const regByte = readByte(state.memory, pc + 1);
      const { rA, rB } = decodeRegisters(regByte);
      const src = getRegisterName(rA);
      const base = getRegisterName(rB);
      if (!src || !base) throw new Y86RuntimeError('寄存器编码无效', StatusCode.INS);
      const displacement = readSignedQuad(state.memory, pc + 2);
      const address = bigIntToNumber(add64(state.registers[base], displacement));
      writeQuad(state.memory, address, state.registers[src], dirtyWords);
      state.pc = pc + 10;
      break;
    }
    case Instruction.MRMOVQ: {
      const regByte = readByte(state.memory, pc + 1);
      const { rA, rB } = decodeRegisters(regByte);
      const dst = getRegisterName(rA);
      const base = getRegisterName(rB);
      if (!dst || !base) throw new Y86RuntimeError('寄存器编码无效', StatusCode.INS);
      const displacement = readSignedQuad(state.memory, pc + 2);
      const address = bigIntToNumber(add64(state.registers[base], displacement));
      state.registers[dst] = readSignedQuad(state.memory, address);
      state.pc = pc + 10;
      break;
    }
    case Instruction.OPQ: {
      const regByte = readByte(state.memory, pc + 1);
      const { rA, rB } = decodeRegisters(regByte);
      const src = getRegisterName(rA);
      const dst = getRegisterName(rB);
      if (!src || !dst) throw new Y86RuntimeError('寄存器编码无效', StatusCode.INS);
      const valA = state.registers[src];
      const valB = state.registers[dst];
      let result = 0n;
      let overflow = false;

      switch (ifun) {
        case ALUOp.ADD: {
          const a = toInt64(valA);
          const b = toInt64(valB);
          result = normalize64(a + b);
          overflow = detectAddOverflow(a, b, result);
          break;
        }
        case ALUOp.SUB: {
          const a = toInt64(valA);
          const b = toInt64(valB);
          const negA = normalize64(-a);
          result = normalize64(b + negA);
          overflow = detectAddOverflow(b, negA, result);
          break;
        }
        case ALUOp.AND: {
          result = normalize64(valB & valA);
          overflow = false;
          break;
        }
        case ALUOp.XOR: {
          result = normalize64(valB ^ valA);
          overflow = false;
          break;
        }
        default:
          throw new Y86RuntimeError(`未知 ALU 操作: ${ifun}`, StatusCode.INS);
      }

      state.registers[dst] = result;
      state.conditionCodes.ZF = result === 0n;
      state.conditionCodes.SF = result < 0n;
      state.conditionCodes.OF = overflow;
      state.pc = pc + 2;
      break;
    }
    case Instruction.JXX: {
      const destination = readUnsignedQuad(state.memory, pc + 1);
      const target = toAddressNumber(destination);
      if (evaluateCondition(ifun, state.conditionCodes)) {
        state.pc = target;
      } else {
        state.pc = pc + 9;
      }
      break;
    }
    case Instruction.CALL: {
      const destination = readUnsignedQuad(state.memory, pc + 1);
      const target = toAddressNumber(destination);
      const returnAddress = pc + 9;
      state.registers.rsp = normalize64(state.registers.rsp - 8n);
      const stackAddr = bigIntToNumber(state.registers.rsp);
      writeQuad(state.memory, stackAddr, BigInt(returnAddress), dirtyWords);
      state.pc = target;
      break;
    }
    case Instruction.RET: {
      const stackAddr = bigIntToNumber(state.registers.rsp);
      const returnAddress = readUnsignedQuad(state.memory, stackAddr);
      state.registers.rsp = normalize64(state.registers.rsp + 8n);
      state.pc = toAddressNumber(returnAddress);
      break;
    }
    case Instruction.PUSHQ: {
      const regByte = readByte(state.memory, pc + 1);
      const { rA } = decodeRegisters(regByte);
      const src = getRegisterName(rA);
      if (!src) throw new Y86RuntimeError('寄存器编码无效', StatusCode.INS);
      state.registers.rsp = normalize64(state.registers.rsp - 8n);
      const stackAddr = bigIntToNumber(state.registers.rsp);
      writeQuad(state.memory, stackAddr, state.registers[src], dirtyWords);
      state.pc = pc + 2;
      break;
    }
    case Instruction.POPQ: {
      const regByte = readByte(state.memory, pc + 1);
      const { rA } = decodeRegisters(regByte);
      const dst = getRegisterName(rA);
      if (!dst) throw new Y86RuntimeError('寄存器编码无效', StatusCode.INS);
      const stackAddr = bigIntToNumber(state.registers.rsp);
      const value = readSignedQuad(state.memory, stackAddr);
      state.registers[dst] = value;
      state.registers.rsp = normalize64(state.registers.rsp + 8n);
      state.pc = pc + 2;
      break;
    }
    default:
      throw new Y86RuntimeError(`未知指令: 0x${icode.toString(16)}`, StatusCode.INS);
  }
};

const readByte = (memory: Uint8Array, address: number): number => {
  if (address < 0 || address >= MEMORY_SIZE) {
    throw new Y86RuntimeError(`读取越界: 0x${address.toString(16)}`, StatusCode.ADR);
  }
  return memory[address];
};

const readSignedQuad = (memory: Uint8Array, address: number): bigint => {
  if (address < 0 || address + 7 >= MEMORY_SIZE) {
    throw new Y86RuntimeError(`读取越界: 0x${address.toString(16)}`, StatusCode.ADR);
  }
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(memory[address + i]) << BigInt(i * 8);
  }
  return BigInt.asIntN(64, value);
};

const readUnsignedQuad = (memory: Uint8Array, address: number): bigint => {
  if (address < 0 || address + 7 >= MEMORY_SIZE) {
    throw new Y86RuntimeError(`读取越界: 0x${address.toString(16)}`, StatusCode.ADR);
  }
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(memory[address + i]) << BigInt(i * 8);
  }
  return BigInt.asUintN(64, value);
};

const writeQuad = (memory: Uint8Array, address: number, rawValue: bigint, dirtyWords: Set<number>): void => {
  if (address < 0 || address + 7 >= MEMORY_SIZE) {
    throw new Y86RuntimeError(`写入越界: 0x${address.toString(16)}`, StatusCode.ADR);
  }
  let value = BigInt.asUintN(64, rawValue);
  for (let i = 0; i < 8; i++) {
    memory[address + i] = Number(value & 0xffn);
    value >>= 8n;
  }
  markMemoryRangeDirty(dirtyWords, address, 8);
};

const decodeRegisters = (regByte: number) => ({
  rA: (regByte >> 4) & 0xf,
  rB: regByte & 0xf,
});

const getRegisterName = (id: number): keyof RegisterFile | null => {
  return REGISTER_NAMES[id] ?? null;
};

const markMemoryRangeDirty = (dirtyWords: Set<number>, start: number, length: number): void => {
  if (length <= 0) return;
  const firstBase = Math.max(0, Math.floor(start / 8) * 8);
  const lastByte = start + length - 1;
  const lastBase = Math.max(0, Math.floor(lastByte / 8) * 8);
  for (let addr = firstBase; addr <= lastBase && addr < MEMORY_SIZE; addr += 8) {
    dirtyWords.add(addr);
  }
};

const serializeState = (state: SimulationState, dirtyWords: Set<number>): RemoteCycle => {
  const registers: Record<string, string> = {};
  for (const key of REGISTER_KEYS) {
    registers[key] = state.registers[key].toString();
  }

  const memorySnapshot = dirtyWords.size > 0 ? snapshotMemory(state.memory, dirtyWords) : {};

  return {
    PC: state.pc,
    STAT: state.stat,
    REG: registers,
    CC: {
      ZF: state.conditionCodes.ZF ? 1 : 0,
      SF: state.conditionCodes.SF ? 1 : 0,
      OF: state.conditionCodes.OF ? 1 : 0,
    },
    MEM: memorySnapshot,
  };
};

const snapshotMemory = (memory: Uint8Array, dirtyWords: Set<number>): Record<string, string> => {
  const entries: Record<string, string> = {};
  const addresses = Array.from(dirtyWords).filter(addr => addr >= 0 && addr < MEMORY_SIZE).sort((a, b) => a - b);

  for (const address of addresses) {
    let value = 0n;
    for (let i = 0; i < 8 && address + i < MEMORY_SIZE; i++) {
      value |= BigInt(memory[address + i]) << BigInt(i * 8);
    }
    entries[address.toString()] = value.toString();
  }

  return entries;
};

const normalize64 = (value: bigint): bigint => BigInt.asIntN(64, value);
const toInt64 = (value: bigint): bigint => BigInt.asIntN(64, value);
const add64 = (a: bigint, b: bigint): bigint => BigInt.asIntN(64, a + b);

const detectAddOverflow = (a: bigint, b: bigint, result: bigint): boolean => {
  const aNeg = a < 0n;
  const bNeg = b < 0n;
  const resNeg = result < 0n;
  return (aNeg === bNeg) && (resNeg !== aNeg);
};

const evaluateCondition = (code: number, flags: ConditionCodeFlags): boolean => {
  switch (code) {
    case ConditionCode.YES:
      return true;
    case ConditionCode.LE:
      return flags.SF !== flags.OF || flags.ZF;
    case ConditionCode.L:
      return flags.SF !== flags.OF;
    case ConditionCode.E:
      return flags.ZF;
    case ConditionCode.NE:
      return !flags.ZF;
    case ConditionCode.GE:
      return flags.SF === flags.OF;
    case ConditionCode.G:
      return !flags.ZF && flags.SF === flags.OF;
    default:
      return false;
  }
};

const bigIntToNumber = (value: bigint): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num >= MEMORY_SIZE) {
    throw new Y86RuntimeError(`内存访问越界: ${value.toString(16)}`, StatusCode.ADR);
  }
  return num;
};

const toAddressNumber = (value: bigint): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num >= MEMORY_SIZE) {
    throw new Y86RuntimeError(`跳转地址越界: ${value.toString(16)}`, StatusCode.ADR);
  }
  return num;
};
