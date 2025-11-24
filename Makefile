# =====================================================
# Y86-64 SEQ CPU Makefile
# =====================================================

# 编译器设置
CC = g++
# 编译选项: -g(调试信息) -Wall(显示警告) -std=c++11(C++标准)
CFLAGS = -g -Wall -std=c++11

# 目标可执行文件名称
TARGET = cpu

# 源文件列表
# 1. cpu.cpp: 我们的主程序 (Fetch-Decode-Execute-...)
# 2. 基础设施 .C 文件: 直接复用原项目的底层实现
SRCS = cpu.cpp \
       Memory.C \
       RegisterFile.C \
       ConditionCodes.C \
       Loader.C \
       Tools.C

# 生成对象文件列表 (.C -> .o, .cpp -> .o)
# 使用 patsubst 函数自动替换后缀
OBJS = $(patsubst %.C, %.o, $(patsubst %.cpp, %.o, $(SRCS)))

# -----------------------------------------------------
# 编译规则
# -----------------------------------------------------

# 默认目标: 执行 make 时默认构建 cpu
all: $(TARGET)

# 链接规则: 将所有 .o 文件链接为可执行文件
$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

# 编译规则 1: 处理 .cpp 文件 (cpu.cpp)
%.o: %.cpp
	$(CC) $(CFLAGS) -c $< -o $@

# 编译规则 2: 处理 .C 文件 (Memory.C 等)
%.o: %.C
	$(CC) $(CFLAGS) -c $< -o $@

# -----------------------------------------------------
# 依赖关系 (手动指定，确保头文件修改后重新编译)
# -----------------------------------------------------
cpu.o: cpu.cpp Memory.h RegisterFile.h ConditionCodes.h Loader.h
Loader.o: Loader.C Loader.h Memory.h
Memory.o: Memory.C Memory.h Tools.h
RegisterFile.o: RegisterFile.C RegisterFile.h
ConditionCodes.o: ConditionCodes.C ConditionCodes.h Tools.h
Tools.o: Tools.C Tools.h

# -----------------------------------------------------
# 清理规则
# -----------------------------------------------------
clean:
	rm -f $(OBJS) $(TARGET) temp_input.yo

# 伪目标，防止目录下有同名文件导致冲突
.PHONY: all clean