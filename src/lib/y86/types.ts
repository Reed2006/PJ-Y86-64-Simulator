// Y86-64 CPU Simulator Types

export interface CPUState {
  pc: number;
  stat: StatusCode;
  registers: RegisterFile;
  conditionCodes: ConditionCodeFlags;
  memory: Uint8Array;
  cycle: number;
}

export interface RegisterFile {
  rax: bigint;
  rcx: bigint;
  rdx: bigint;
  rbx: bigint;
  rsp: bigint;
  rbp: bigint;
  rsi: bigint;
  rdi: bigint;
  r8: bigint;
  r9: bigint;
  r10: bigint;
  r11: bigint;
  r12: bigint;
  r13: bigint;
  r14: bigint;
}

export interface ConditionCodeFlags {
  ZF: boolean;
  SF: boolean;
  OF: boolean;
}

export enum StatusCode {
  AOK = 1,  // Normal operation
  HLT = 2,  // Halt instruction encountered
  ADR = 3,  // Invalid address
  INS = 4,  // Invalid instruction
}

export enum Instruction {
  HALT = 0x0,
  NOP = 0x1,
  RRMOVQ = 0x2,  // Also includes conditional moves (cmovXX)
  IRMOVQ = 0x3,
  RMMOVQ = 0x4,
  MRMOVQ = 0x5,
  OPQ = 0x6,
  JXX = 0x7,
  CALL = 0x8,
  RET = 0x9,
  PUSHQ = 0xA,
  POPQ = 0xB,
}

export const INSTRUCTION_NAMES: Record<number, keyof InstructionStats> = {
  0x0: 'HALT',
  0x1: 'NOP',
  0x2: 'RRMOVQ',
  0x3: 'IRMOVQ',
  0x4: 'RMMOVQ',
  0x5: 'MRMOVQ',
  0x6: 'OPQ',
  0x7: 'JXX',
  0x8: 'CALL',
  0x9: 'RET',
  0xA: 'PUSHQ',
  0xB: 'POPQ',
}

export enum ALUOp {
  ADD = 0x0,
  SUB = 0x1,
  AND = 0x2,
  XOR = 0x3,
}

export enum ConditionCode {
  YES = 0x0,  // Unconditional
  LE = 0x1,   // Less or equal
  L = 0x2,    // Less
  E = 0x3,    // Equal
  NE = 0x4,   // Not equal
  GE = 0x5,   // Greater or equal
  G = 0x6,    // Greater
}

export enum Register {
  RAX = 0x0,
  RCX = 0x1,
  RDX = 0x2,
  RBX = 0x3,
  RSP = 0x4,
  RBP = 0x5,
  RSI = 0x6,
  RDI = 0x7,
  R8 = 0x8,
  R9 = 0x9,
  R10 = 0xA,
  R11 = 0xB,
  R12 = 0xC,
  R13 = 0xD,
  R14 = 0xE,
  RNONE = 0xF,
}

export const REGISTER_NAMES: Record<number, keyof RegisterFile> = {
  0x0: 'rax',
  0x1: 'rcx',
  0x2: 'rdx',
  0x3: 'rbx',
  0x4: 'rsp',
  0x5: 'rbp',
  0x6: 'rsi',
  0x7: 'rdi',
  0x8: 'r8',
  0x9: 'r9',
  0xA: 'r10',
  0xB: 'r11',
  0xC: 'r12',
  0xD: 'r13',
  0xE: 'r14',
};

export interface ExecutionLog {
  timestamp: number;
  cycle: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface SimulatorSnapshot {
  pc: number;
  stat: StatusCode;
  registers: Record<string, string>;  // Hex strings
  conditionCodes: ConditionCodeFlags;
  memory: Record<number, string>;  // Address -> hex value
  cycle: number;
}

export interface Breakpoint {
  id: string;
  address: number;  // Memory address where breakpoint is set
  enabled: boolean;
  condition?: string;  // Optional condition expression (e.g., "rax==10")
  hitCount: number;  // Number of times this breakpoint has been hit
}

export interface BreakpointHit {
  breakpoint: Breakpoint;
  cycle: number;
  pc: number;
}

export interface ExecutionSnapshot {
  id: string;  // Unique identifier (UUID)
  timestamp: number;  // When snapshot was taken
  cycle: number;  // Cycle count at snapshot time
  pc: number;  // Program counter
  stat: StatusCode;  // CPU status
  registers: RegisterFile;  // Deep copy of all registers
  conditionCodes: ConditionCodeFlags;  // ZF, SF, OF flags
  memory: Uint8Array;  // Deep copy of memory state
  instruction?: string;  // Optional: decoded instruction string for UI
}

// Performance Statistics Types
export interface InstructionStats {
  HALT: number;
  NOP: number;
  RRMOVQ: number;
  IRMOVQ: number;
  RMMOVQ: number;
  MRMOVQ: number;
  OPQ: number;
  JXX: number;
  CALL: number;
  RET: number;
  PUSHQ: number;
  POPQ: number;
}

export interface MemoryAccessStats {
  reads: Map<number, number>;  // Address -> access count
  writes: Map<number, number>;
  totalReads: number;
  totalWrites: number;
}

export interface RegisterUsageStats {
  reads: Record<keyof RegisterFile, number>;
  writes: Record<keyof RegisterFile, number>;
}

export interface PerformanceMetrics {
  instructionStats: InstructionStats;
  memoryAccessStats: MemoryAccessStats;
  registerUsageStats: RegisterUsageStats;
  totalCycles: number;
  totalInstructions: number;
  averageCPI: number;  // Cycles Per Instruction
  hotspotAddresses: Array<{ address: number; accessCount: number }>;
}
