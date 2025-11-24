/**
 * Y86-64 Sequential CPU Simulator
 * * Implements the 5-stage sequential logic:
 * Fetch -> Decode -> Execute -> Memory -> Writeback -> PC Update
 */

#include <iostream>
#include <fstream>
#include <iomanip>
#include <vector>
#include <string>
#include <algorithm> // for remove

// 引入基础设施
#include "Memory.h"
#include "RegisterFile.h"
#include "ConditionCodes.h"
#include "Loader.h"

// =============================================================
// 常量定义 (Instruction Opcodes & Settings)
// =============================================================

// Instructions
#define IHALT   0x0
#define INOP    0x1
#define IRRMOVQ 0x2
#define IIRMOVQ 0x3
#define IRMMOVQ 0x4
#define IMRMOVQ 0x5
#define IOPQ    0x6
#define IJXX    0x7
#define ICALL   0x8
#define IRET    0x9
#define IPUSHQ  0xA
#define IPOPQ   0xB

// ALU Operations (ifun)
#define ALUADD  0x0
#define ALUSUB  0x1
#define ALUAND  0x2
#define ALUXOR  0x3

// Condition Codes (Jump/CMOV ifun)
#define C_YES   0x0
#define C_LE    0x1
#define C_L     0x2
#define C_E     0x3
#define C_NE    0x4
#define C_GE    0x5
#define C_G     0x6

// Status
#define SAOK    1
#define SHLT    2
#define SADR    3
#define SINS    4

// =============================================================
// 辅助函数
// =============================================================

// 判断是否需要寄存器指引字节
bool needsRegByte(uint64_t icode) {
    return icode == IRRMOVQ || icode == IOPQ || icode == IPUSHQ || 
           icode == IPOPQ || icode == IIRMOVQ || icode == IRMMOVQ || icode == IMRMOVQ;
}

// 判断是否需要常数 valC
bool needsValC(uint64_t icode) {
    return icode == IIRMOVQ || icode == IRMMOVQ || icode == IMRMOVQ || 
           icode == IJXX || icode == ICALL;
}

// 判断条件码 (用于 Jump 和 CMOV)
bool checkCond(uint64_t ifun, uint64_t zf, uint64_t sf, uint64_t of) {
    switch (ifun) {
        case C_YES: return true;
        case C_LE:  return (sf ^ of) | zf;
        case C_L:   return sf ^ of;
        case C_E:   return zf;
        case C_NE:  return !zf;
        case C_GE:  return !(sf ^ of);
        case C_G:   return !(sf ^ of) & !zf;
        default:    return false;
    }
}

// JSON 输出辅助函数
void printJson(int cycle, uint64_t PC, int stat, 
               Memory* mem, RegisterFile* rf, ConditionCodes* cc, bool firstOutput) {
    
    if (!firstOutput) std::cout << "," << std::endl;
    std::cout << "    {" << std::endl;

    // 1. CC
    bool err;
    uint64_t zf = cc->getConditionCode(ZF, err);
    uint64_t sf = cc->getConditionCode(SF, err);
    uint64_t of = cc->getConditionCode(OF, err);
    std::cout << "        \"CC\": {" << std::endl;
    std::cout << "            \"OF\": " << of << "," << std::endl;
    std::cout << "            \"SF\": " << sf << "," << std::endl;
    std::cout << "            \"ZF\": " << zf << std::endl;
    std::cout << "        }," << std::endl;

    // 2. MEM (只输出非零值)
    std::cout << "        \"MEM\": {" << std::endl;
    bool firstMem = true;
    // [FIX] 使用 Memory.h 中的 MEMSIZE，确保遍历整个内存
    for (int i = 0; i < MEMSIZE; i += 8) {
        uint64_t val = mem->getLong(i, err);
        if (val != 0) {
            if (!firstMem) std::cout << "," << std::endl;
            // [FIX] 强制转换为 int64_t 输出有符号数
            std::cout << "            \"" << i << "\": " << (int64_t)val;
            firstMem = false;
        }
    }
    if (!firstMem) std::cout << std::endl;
    std::cout << "        }," << std::endl;

    // 3. PC
    std::cout << "        \"PC\": " << PC << "," << std::endl;

    // 4. REG
    std::cout << "        \"REG\": {" << std::endl;
    const char* regNames[] = {"rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi", 
                              "r8", "r9", "r10", "r11", "r12", "r13", "r14"};
    for (int i = 0; i < 15; i++) {
        // [FIX] 强制转换为 int64_t 输出有符号数
        std::cout << "            \"" << regNames[i] << "\": " << (int64_t)rf->readRegister(i, err);
        if (i < 14) std::cout << ",";
        std::cout << std::endl;
    }
    std::cout << "        }," << std::endl;

    // 5. STAT
    std::cout << "        \"STAT\": " << stat << std::endl;
    std::cout << "    }";
}

// =============================================================
// 主程序
// =============================================================

int main(int argc, char *argv[]) {
    // ---------------------------------------------------------
    // 1. 输入适配：处理 stdin
    // ---------------------------------------------------------
    const char* temp_filename = "temp_input.yo";
    std::ofstream temp_file(temp_filename);
    if (!temp_file) {
        std::cerr << "Error creating temp file" << std::endl;
        return 1;
    }
    temp_file << std::cin.rdbuf();
    temp_file.close();

    // ---------------------------------------------------------
    // 2. 初始化硬件 & 加载程序
    // ---------------------------------------------------------
    Memory* mem = Memory::getInstance();
    RegisterFile* rf = RegisterFile::getInstance();
    ConditionCodes* cc = ConditionCodes::getInstance();

    // 初始化 ZF = 1 (符合 Y86 标准行为)
    bool init_err;
    cc->setConditionCode(1, ZF, init_err);
    cc->setConditionCode(0, SF, init_err);
    cc->setConditionCode(0, OF, init_err);
    
    char* fake_argv[] = { (char*)"./cpu", (char*)temp_filename };
    Loader loader(2, fake_argv);
    
    if (!loader.isLoaded()) {
        std::cerr << "Load error" << std::endl;
        return 0;
    }

    // ---------------------------------------------------------
    // 3. CPU 模拟主循环
    // ---------------------------------------------------------
    uint64_t PC = 0;
    int stat = SAOK;
    int cycle = 0;
    int max_cycles = 10000; // 提高上限以支持较长的测试

    std::cout << "[" << std::endl; // JSON Array Start

    while (stat == SAOK && cycle < max_cycles) {
        bool err = false;
        bool imem_error = false;
        bool dmem_error = false;
        bool instr_valid = true;

        // 保存当前周期的 PC，以便在发生异常/HALT 时恢复
        uint64_t currPC = PC;

        // --- FETCH Stage ---
        uint8_t instrByte = mem->getByte(PC, imem_error);
        uint64_t icode = (instrByte >> 4) & 0xF;
        uint64_t ifun = instrByte & 0xF;
        
        uint64_t valP = PC + 1;
        
        uint64_t rA = RNONE;
        uint64_t rB = RNONE;
        if (needsRegByte(icode)) {
            uint8_t regByte = mem->getByte(valP, imem_error);
            rA = (regByte >> 4) & 0xF;
            rB = regByte & 0xF;
            valP += 1;
        }

        uint64_t valC = 0;
        if (needsValC(icode)) {
            valC = mem->getLong(valP, imem_error);
            valP += 8;
        }

        // 检查指令合法性
        if (icode > IPOPQ) instr_valid = false;

        // --- DECODE Stage ---
        uint64_t srcA = RNONE;
        if (icode == IRRMOVQ || icode == IRMMOVQ || icode == IOPQ || icode == IPUSHQ) srcA = rA;
        else if (icode == IPOPQ || icode == IRET) srcA = RSP;

        uint64_t srcB = RNONE;
        if (icode == IOPQ || icode == IRMMOVQ || icode == IMRMOVQ) srcB = rB;
        else if (icode == IPUSHQ || icode == IPOPQ || icode == ICALL || icode == IRET) srcB = RSP;

        uint64_t valA = rf->readRegister(srcA, err);
        uint64_t valB = rf->readRegister(srcB, err);

        // --- EXECUTE Stage ---
        uint64_t valE = 0;
        bool Cnd = false;

        // aluA Input Mux
        uint64_t aluA = 0;
        if (icode == IRRMOVQ || icode == IOPQ) aluA = valA;
        else if (icode == IIRMOVQ || icode == IRMMOVQ || icode == IMRMOVQ) aluA = valC;
        else if (icode == ICALL || icode == IPUSHQ) aluA = -8;
        else if (icode == IRET || icode == IPOPQ) aluA = 8;

        // aluB Input Mux
        uint64_t aluB = 0;
        if (icode == IRMMOVQ || icode == IMRMOVQ || icode == IOPQ || 
            icode == ICALL || icode == IPUSHQ || icode == IRET || icode == IPOPQ) aluB = valB;
        else if (icode == IRRMOVQ || icode == IIRMOVQ) aluB = 0;

        // ALU Operation
        if (icode == IOPQ) {
            if (ifun == ALUADD) valE = aluB + aluA;
            else if (ifun == ALUSUB) valE = aluB - aluA;
            else if (ifun == ALUAND) valE = aluB & aluA;
            else if (ifun == ALUXOR) valE = aluB ^ aluA;

            // Set CC
            bool set_cc_err;
            uint64_t zf = (valE == 0);
            uint64_t sf = ((int64_t)valE < 0);
            uint64_t of = 0;
            
            if (ifun == ALUADD) {
                of = (((int64_t)aluA > 0 && (int64_t)aluB > 0 && (int64_t)valE < 0) ||
                      ((int64_t)aluA < 0 && (int64_t)aluB < 0 && (int64_t)valE > 0));
            } else if (ifun == ALUSUB) {
                of = (((int64_t)aluB < 0 && (int64_t)aluA > 0 && (int64_t)valE > 0) ||
                      ((int64_t)aluB > 0 && (int64_t)aluA < 0 && (int64_t)valE < 0));
            }
            
            cc->setConditionCode(zf, ZF, set_cc_err);
            cc->setConditionCode(sf, SF, set_cc_err);
            cc->setConditionCode(of, OF, set_cc_err);
        } else {
            valE = aluB + aluA;
        }

        // Cnd Logic
        bool errCC;
        if (icode == IJXX || icode == IRRMOVQ) { 
             Cnd = checkCond(ifun, cc->getConditionCode(ZF, errCC), 
                             cc->getConditionCode(SF, errCC), 
                             cc->getConditionCode(OF, errCC));
        }

        // --- MEMORY Stage ---
        uint64_t mem_addr = 0;
        if (icode == IRMMOVQ || icode == IPUSHQ || icode == ICALL || icode == IMRMOVQ) mem_addr = valE;
        else if (icode == IPOPQ || icode == IRET) mem_addr = valA;

        uint64_t mem_data = 0;
        if (icode == IRMMOVQ || icode == IPUSHQ) mem_data = valA;
        else if (icode == ICALL) mem_data = valP;

        bool mem_read = (icode == IMRMOVQ || icode == IPOPQ || icode == IRET);
        bool mem_write = (icode == IRMMOVQ || icode == IPUSHQ || icode == ICALL);

        uint64_t valM = 0;
        if (mem_read) {
            valM = mem->getLong(mem_addr, dmem_error);
        }
        if (mem_write) {
            mem->putLong(mem_data, mem_addr, dmem_error);
        }

        // --- WRITEBACK Stage ---
        uint64_t dstE = RNONE;
        if (icode == IRRMOVQ && !Cnd) dstE = RNONE;
        else if (icode == IRRMOVQ || icode == IIRMOVQ || icode == IOPQ) dstE = rB;
        else if (icode == IPUSHQ || icode == IPOPQ || icode == ICALL || icode == IRET) dstE = RSP;

        uint64_t dstM = RNONE;
        if (icode == IMRMOVQ || icode == IPOPQ) dstM = rA;

        rf->writeRegister(valE, dstE, err);
        rf->writeRegister(valM, dstM, err);

        // --- Update Status (Before PC Update) ---
        if (imem_error || dmem_error) stat = SADR;
        else if (!instr_valid) stat = SINS;
        else if (icode == IHALT) stat = SHLT;
        else stat = SAOK;

        // --- PC Update Stage ---
        uint64_t nextPC;
        if (icode == ICALL) nextPC = valC;
        else if (icode == IJXX && Cnd) nextPC = valC;
        else if (icode == IJXX && !Cnd) nextPC = valP;
        else if (icode == IRET) nextPC = valM;
        else nextPC = valP;

        // 如果发生异常或 HALT，保持当前 PC
        if (stat == SAOK) {
            PC = nextPC;
        } else {
            PC = currPC; 
        }

        // --- Output State (JSON) ---
        printJson(cycle, PC, stat, mem, rf, cc, cycle == 0);

        cycle++;
        if (stat != SAOK) break;
    }

    std::cout << std::endl << "]" << std::endl; // JSON Array End
    
    // Cleanup
    remove(temp_filename);
    return 0;
}