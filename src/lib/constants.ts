/**
 * 统一管理所有中文文案，确保简体中文一致性
 */

// 组件标题
export const COMPONENT_TITLES = {
  // 编辑器
  CODE_EDITOR: '汇编代码编辑器',
  FILE_EXPLORER: '文件资源管理器',
  
  // CPU 状态
  REGISTERS: '寄存器',
  CONDITION_CODES: '条件码',
  MEMORY_VIEW: '内存视图',
  CPU_DASHBOARD: 'CPU 仪表盘',
  
  // 调试工具
  BREAKPOINTS: '断点调试',
  EXECUTION_HISTORY: '执行历史',
  AI_ASSISTANT: 'AI 代码助手',
  TERMINAL: '输出终端',
  
  // 控制面板
  CONTROL_CENTER: '控制中心',
  STATUS: '状态',
  CYCLE: '周期',
  PC: '程序计数器',
} as const;

// 按钮文本
export const BUTTON_LABELS = {
  // 控制按钮
  LOAD: '加载',
  RUN: '运行',
  STEP: '单步',
  PAUSE: '暂停',
  RESET: '重置',
  CONTINUE: '继续',
  
  // 断点操作
  ADD_BREAKPOINT: '添加',
  REMOVE_BREAKPOINT: '删除',
  TOGGLE_BREAKPOINT: '切换',
  EDIT_BREAKPOINT: '编辑',
  SAVE: '保存',
  CANCEL: '取消',
  
  // 历史操作
  JUMP_TO: '跳转',
  COMPARE: '对比',
  EXPORT: '导出',
  
  // 文件操作
  NEW_FILE: '新建文件',
  UPLOAD: '上传',
  CLEAR: '清空',
} as const;

// 提示信息
export const TOAST_MESSAGES = {
  // 成功消息
  SNAPSHOT_JUMPED: '已跳转到指定快照',
  HISTORY_EXPORTED: (count: number) => `已导出 ${count} 条执行记录`,
  BREAKPOINT_ADDED: '断点已添加',
  BREAKPOINT_REMOVED: '断点已删除',
  BREAKPOINT_TOGGLED: '断点状态已切换',
  CODE_COPIED: '代码已复制到剪贴板',
  
  // 错误消息
  JUMP_FAILED: '跳转失败：快照不存在',
  EXPORT_FAILED: '导出失败',
  NO_HISTORY: '没有可导出的历史记录',
  INVALID_ADDRESS: '无效的地址格式',
  
  // 警告消息
  NO_SNAPSHOTS_TO_COMPARE: '请选择两个快照进行对比',
  SAME_SNAPSHOT: '不能对比相同的快照',
  NO_CODE: '请先输入代码',
} as const;

// 寄存器名称映射
export const REGISTER_NAMES = {
  RAX: '%rax',
  RCX: '%rcx',
  RDX: '%rdx',
  RBX: '%rbx',
  RSP: '%rsp',
  RBP: '%rbp',
  RSI: '%rsi',
  RDI: '%rdi',
  R8: '%r8',
  R9: '%r9',
  R10: '%r10',
  R11: '%r11',
  R12: '%r12',
  R13: '%r13',
  R14: '%r14',
} as const;

// 条件码标签
export const CONDITION_CODE_LABELS = {
  ZF: 'ZF',
  SF: 'SF',
  OF: 'OF',
} as const;

// 条件码描述
export const CONDITION_CODE_DESCRIPTIONS = {
  ZF: '零标志位',
  SF: '符号标志位',
  OF: '溢出标志位',
  ZF_HINT: '结果为零时置位',
  SF_HINT: '结果为负时置位',
  OF_HINT: '有符号溢出时置位',
} as const;

// CPU 状态
export const CPU_STATUS = {
  AOK: 'AOK',
  HLT: 'HLT',
  ADR: 'ADR',
  INS: 'INS',
} as const;

// CPU 状态描述
export const CPU_STATUS_DESCRIPTIONS = {
  AOK: '正常运行',
  HLT: '已停止',
  ADR: '地址错误',
  INS: '指令错误',
} as const;

// 内存视图
export const MEMORY_VIEW_LABELS = {
  ADDRESS: '地址',
  HEX: '十六进制',
  ASCII: '字符',
  BYTES: '字节',
  ACTIVE_REGIONS: '个活动区域',
} as const;

// 断点面板
export const BREAKPOINT_LABELS = {
  ADDRESS: '地址',
  CONDITION: '条件',
  HIT_COUNT: '命中次数',
  ENABLED: '已启用',
  DISABLED: '已禁用',
  ADDRESS_PLACEHOLDER: '0x000',
  CONDITION_PLACEHOLDER: '可选，如 rax==10',
} as const;

// 执行历史
export const HISTORY_LABELS = {
  CYCLE: '周期',
  PC: '地址',
  INSTRUCTION: '指令',
  STATUS: '状态',
  NO_HISTORY: '暂无执行历史',
  COMPARISON_RESULT: '快照对比结果',
  REGISTER_CHANGES: '寄存器变化',
  CC_CHANGES: '条件码变化',
  NO_CHANGES: '无',
} as const;

// AI 助手
export const AI_ASSISTANT_LABELS = {
  PLACEHOLDER: '提问关于代码、调试技巧或 Y86-64 架构...',
  EMPTY_TITLE: '开始提问',
  EMPTY_DESCRIPTION: '我可以帮你理解代码、分析执行流程、解答 Y86-64 相关问题',
  SENDING: '发送中...',
  ERROR: 'AI 服务暂时不可用',
} as const;

// 文件资源管理器
export const FILE_EXPLORER_LABELS = {
  TITLE: '资源管理器',
  EXAMPLES: '示例程序',
  MY_FILES: '我的文件',
  NEW_FILE: '新建文件',
  UPLOAD: '上传文件',
} as const;

// 状态栏
export const STATUS_BAR_LABELS = {
  READY: '就绪',
  RUNNING: '运行中',
  PAUSED: '已暂停',
  ERROR: '错误',
  FILE: '文件',
  LINE: '行',
  COLUMN: '列',
} as const;

// 终端
export const TERMINAL_LABELS = {
  TITLE: '输出终端',
  WELCOME: '> Y86-64 CPU 模拟器已启动',
  CLEAR: '清空',
  READY: '> 就绪',
  LOADING: '> 正在加载程序...',
  RUNNING: '> 程序运行中...',
  HALTED: '> 程序已停止',
  ERROR: '> 错误',
} as const;

// 快照对比
export const generateComparisonMessage = (
  snap1: { cycle: number; pc: number },
  snap2: { cycle: number; pc: number },
  registerDiffs: string[],
  ccDiffs: string[]
): string => {
  return `快照对比结果:
周期: ${snap1.cycle} → ${snap2.cycle}
PC: 0x${snap1.pc.toString(16)} → 0x${snap2.pc.toString(16)}
寄存器变化: ${registerDiffs.length > 0 ? registerDiffs.join(', ') : '无'}
条件码变化: ${ccDiffs.length > 0 ? ccDiffs.join(', ') : '无'}`;
};
