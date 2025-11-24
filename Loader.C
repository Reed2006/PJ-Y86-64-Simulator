#include <iostream>
#include <fstream>
#include <string.h>
#include <ctype.h>
#include <stdint.h>
#include "Loader.h"
#include "Memory.h"

#define ADDRBEGIN 2
#define ADDREND 4
#define DATABEGIN 7
#define COMMENT 28

/* * Loader
 * opens up the file named in argv[0] and loads the
 * contents into memory. If the file is able to be loaded,
 * then loaded is set to true.
 */
Loader::Loader(int argc, char * argv[])
{
   std::ifstream inf;  //input file stream for reading from file
   int lineNumber = 1;
   lastAddress = -1;
   loaded = false;

   if (argc < 2 || badFile(argv[1])) return;  
   inf.open(argv[1]);

   if (!inf.is_open()) return;  
  
   std::string line;
   while (getline(inf, line))
   {
      if (hasErrors(line))
      {
         std::cout << "Error on line " << std::dec << lineNumber 
              << ": " << line << std::endl;
         return;
      }
      if (hasAddress(line) && hasData(line)) loadLine(line);
      lineNumber++;
   }
   loaded = true;
}

bool Loader::hasAddress(std::string line)
{
   return line.at(0) == 0x30;
}

bool Loader::hasData(std::string line)
{
   return line.at(DATABEGIN) != 0x20;
}

bool Loader::hasComment(std::string line)
{
   return line.at(COMMENT) == 0x7C;
}

void Loader::loadLine(std::string line)
{
   int32_t address = Loader::convert(line, ADDRBEGIN, ADDREND - 1);

   bool imem_error;
   for (int i = DATABEGIN; line.at(i) != 0x20; i += 2) {
      lastAddress = address + (i - DATABEGIN)/2;
      Memory::getInstance()->putByte(Loader::convert(line, i, 2), lastAddress, imem_error);
   }
}

int32_t Loader::convert(std::string line, int32_t start, int32_t len)
{
   std::string substring = line.substr(start, len);
   return (int32_t) strtoul(substring.c_str(), NULL, 16);
}

/*
 * hasErrors
 * Returns true if the line file has errors in it and false
 * otherwise.
 */
bool Loader::hasErrors(std::string line)
{
   // 1) Length & Comment check
   // [FIX] limit length check to > COMMENT to avoid index out of bound access
   if (line.length() <= COMMENT || !hasComment(line)) {
      return true;
   }

   // 2) Check for address
   if (!hasAddress(line)) {
      if (!isSpaces(line, 0, COMMENT - 1)) {
         return true;
      }
   }

   // 3) Validate address format
   if (hasAddress(line)) {
      if (errorAddr(line)) {
         return true;
      }
   } 
   
   // 4) Check for data presence
   if (!hasData(line)) {
      if (!isSpaces(line, ADDREND + 2, COMMENT - 1)) {
         return true;
      }
   }

   // 5) Validate data format
   int32_t numDBytes = 0;
   if (errorData(line, numDBytes)) {
      return true;
   }

   // 6) & 7) Address Logic Check
   // [FIX] 只有当行内包含数据时，才强制检查地址递增和内存越界
   // 这样可以忽略像 ".pos 0x40" 这种只有地址没有数据的标记行
   if (hasAddress(line) && hasData(line)) {
      int32_t newAddress = Loader::convert(line, ADDRBEGIN, ADDREND - 1);
      
      // Check 6: Address sequence
      if (newAddress <= lastAddress) {
         return true;
      }

      // Check 7: Memory bound
      if (newAddress + numDBytes > MEMSIZE) {
         return true;
      }
   }
   
   return false;
}

bool Loader::errorData(std::string line, int32_t & numDBytes)
{
   int i = 0;
   for(i = DATABEGIN; line.at(i) != 0x20; i++) {
      if(!isxdigit(line.at(i))) {
         return true;
      }
   }
   int dataEnd = i;
   if((dataEnd - DATABEGIN) % 2 != 0) {
      return true;
   }
   if(!isSpaces(line, dataEnd, COMMENT - 1)) {
      return true;
   }
   numDBytes = (dataEnd - DATABEGIN) / 2;
   return false;
}

bool Loader::errorAddr(std::string line)
{
   if (line.at(0) != 0x30 || line.at(1) != 0x78 || line.at(ADDREND + 1) != 0x3a || line.at(ADDREND + 2) != 0x20) {
      return true;
   }
   for (int i = ADDRBEGIN; i <= ADDREND; i++) {
      if (!isxdigit(line.at(i))) {
         return true;
      }
   }
   return false;
}

bool Loader::isSpaces(std::string line, int32_t start, int32_t end)
{
   for(int i = start; i <= end; i++){
      if(line.at(i) != 0x20) {
         return false;
      }
   }
   return true;
}

bool Loader::isLoaded()
{
   return loaded;  
}

bool Loader::badFile(std::string filename)
{
   int mainLength = 0;
   // Safety check for finding extension
   if (filename.length() < 3) return true;
   
   while(mainLength < filename.length() - 3 && filename.at(mainLength + 1) != 0x2E) {
      mainLength++;
   }

   if(mainLength < 3) { // rudimentary check, might need refinement if filename logic is strict
      return true;
   }
   else {
      // Check for .yo extension
      size_t dotPos = filename.find_last_of('.');
      if (dotPos == std::string::npos || filename.substr(dotPos) != ".yo") return true;
      return false;
   }
}