import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import RegisterPanel from './RegisterPanel';
import ConditionCodesBadge from './ConditionCodesBadge';
import MemoryView from './MemoryView';
import { RegisterFile, ConditionCodeFlags } from '@/lib/y86/types';
import { Cpu, Zap, Database } from 'lucide-react';
import { COMPONENT_TITLES } from '@/lib/constants';

interface CPUDashboardProps {
  registers: RegisterFile;
  previousRegisters?: RegisterFile;
  conditionCodes: ConditionCodeFlags;
  previousConditionCodes?: ConditionCodeFlags;
  memory: Uint8Array;
  previousMemory?: Uint8Array;
  pc: number;
}

const CPUDashboard = ({
  registers,
  previousRegisters,
  conditionCodes,
  previousConditionCodes,
  memory,
  previousMemory,
  pc
}: CPUDashboardProps) => {
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <Tabs defaultValue="registers" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-[#252526] border-b border-border rounded-none h-10">
          <TabsTrigger 
            value="registers" 
            className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none"
          >
            <Cpu className="w-4 h-4 mr-2" />
            <span>{COMPONENT_TITLES.REGISTERS}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="condition" 
            className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none"
          >
            <Zap className="w-4 h-4 mr-2" />
            <span>{COMPONENT_TITLES.CONDITION_CODES}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="memory" 
            className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none"
          >
            <Database className="w-4 h-4 mr-2" />
            <span>内存</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registers" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <RegisterPanel 
                registers={registers} 
                previousRegisters={previousRegisters} 
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="condition" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <ConditionCodesBadge 
                flags={conditionCodes}
                previousFlags={previousConditionCodes}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="memory" className="flex-1 m-0 overflow-hidden">
          <MemoryView 
            memory={memory}
            previousMemory={previousMemory}
            pc={pc}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CPUDashboard;
