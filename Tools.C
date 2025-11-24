#include <cstdint>
#include "Tools.h"
#include <cstdlib>
#include <string>

/** 
 * builds a 64-bit long out of an array of 8 bytes
 *
 * for example, suppose bytes[0] == 0x12
 *              and     bytes[1] == 0x34
 *              and     bytes[2] == 0x56
 *              and     bytes[3] == 0x78
 *              and     bytes[4] == 0x9a
 *              and     bytes[5] == 0xbc
 *              and     bytes[6] == 0xde
 *              and     bytes[7] == 0xf0
 * then buildLong(bytes) returns 0xf0debc9a78563412
 *
 * @param array of 8 bytes
 * @return uint64_t where the low order byte is bytes[0] and
 *         the high order byte is bytes[7]
*/
uint64_t Tools::buildLong(uint8_t bytes[LONGSIZE])
{
	uint64_t result = 0;
	for (int i = 0; i < 8; i++){
		result = result | ((uint64_t)bytes[i] << 8*i);
	}
	return result;
}

uint64_t Tools::getByte(uint64_t source, int32_t byteNum)
{
   return (source >> byteNum * 8) & 255 * !(byteNum >> 3);
}

uint64_t Tools::getBits(uint64_t source, int32_t low, int32_t high)
{
   if(low < 0 || high > 63) {
      return 0;
   }
   return (source << (63 - high)) >> ((63 - high) + low);
}

uint64_t Tools::setBits(uint64_t source, int32_t low, int32_t high)
{
   if(low >= 0 && high <= 63) {
      uint64_t mask = 0xffffffffffffffff;
      return source | ((mask << (63 - high)) >> ((63 - high) + low) << low);
   }
   return source;
}

uint64_t Tools::clearBits(uint64_t source, int32_t low, int32_t high)
{
   if(low >= 0 && low <= 63 && high >= 0 && high <= 63) {
      uint64_t mask = 0xffffffffffffffff;
      return source & ~((mask << (63 - high)) >> ((63 - high) + low) << low);
   }
   return source;
}

uint64_t Tools::copyBits(uint64_t source, uint64_t dest, int32_t srclow, int32_t dstlow, int32_t length)
{
   if(srclow >= 0 && srclow + (length-1) <= 63 && dstlow >= 0 && dstlow + (length-1) <= 63) {
      return (getBits(source, srclow, srclow + (length - 1)) << dstlow) | (clearBits(dest, dstlow, dstlow + (length - 1)));
   }
   return dest;
}

uint64_t Tools::setByte(uint64_t source, int32_t byteNum)
{
   return source | ((getBits(UINT64_MAX, 0, 7)) << (byteNum * 8)) * !(byteNum >> 3);
}

uint8_t Tools::sign(uint64_t source)
{
   return source >> 63;
}

bool Tools::addOverflow(uint64_t op1, uint64_t op2)
{
   uint64_t var = (sign(op1) && sign(op2) && !sign(op1 + op2));
   uint64_t var2 = (!sign(op1) && !sign(op2) && sign(op1 +op2));
   uint64_t var3 = var || var2;
   return var3;
}

/**
 * [FIXED] Robust subOverflow implementation
 * Returns true if op2 - op1 overflows.
 */
bool Tools::subOverflow(uint64_t op1, uint64_t op2)
{
   // 结果 = op2 - op1
   uint64_t res = op2 - op1;
   
   // 溢出情况 1: op2 >= 0 (sign=0), op1 < 0 (sign=1), res < 0 (sign=1)
   // 正数 - 负数 = 结果变成负数
   uint64_t case1 = !sign(op2) && sign(op1) && sign(res);

   // 溢出情况 2: op2 < 0 (sign=1), op1 >= 0 (sign=0), res >= 0 (sign=0)
   // 负数 - 正数 = 结果变成正数
   uint64_t case2 = sign(op2) && !sign(op1) && !sign(res);

   return case1 || case2;
}