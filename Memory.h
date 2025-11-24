// PJ-Y86-64-Simulator/Memory.h
#ifndef MEMORY_H
#define MEMORY_H

#include <cstdint>

// [FIX] 扩大内存大小，防止栈溢出或地址越界
// 0x1000 (4KB) 可能不够，0x8000 (32KB) 足够应对大多数测试
#define MEMSIZE 0x8000 

class Memory 
{
   private:
      static Memory * memInstance;
      Memory();
      uint8_t mem[MEMSIZE];
   public:
      static Memory * getInstance();      
      uint64_t getLong(int32_t address, bool & error);
      uint8_t getByte(int32_t address, bool & error);
      void putLong(uint64_t value, int32_t address, bool & error);
      void putByte(uint8_t value, int32_t address, bool & error);
      void dump();
}; 

#endif