import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Folder, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Upload, 
  FilePlus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileItem {
  id: string; // 添加唯一ID
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileItem[];
}

interface FileExplorerProps {
  onFileSelect: (content: string, fileName: string) => void;
  currentFileName?: string;
}

const SAMPLE_FILES: FileItem[] = [
  {
    id: 'folder-examples',
    name: '示例程序',
    type: 'folder',
    children: [
      {
        id: 'file-fibonacci',
        name: 'fibonacci.yo',
        type: 'file',
        content: `# Fibonacci sequence (compute the 7th value)
# Register names follow the standard ABI
0x000: 30f00100000000000000 | irmovq $1, %rax      # F(0) = 1
0x00a: 30f30100000000000000 | irmovq $1, %rbx      # F(1) = 1
0x014: 30f10700000000000000 | irmovq $7, %rcx      # target term
0x01e: 30f20200000000000000 | irmovq $2, %rdx      # loop counter

# Loop body
0x028: 2036                 | rrmovq %rbx, %rsi    # save current value
0x02a: 6003                 | addq %rax, %rbx      # F(n) = F(n-1) + F(n-2)
0x02c: 2060                 | rrmovq %rsi, %rax    # update F(n-2)
0x02e: 30f60100000000000000 | irmovq $1, %rsi      # constant 1
0x038: 6062                 | addq %rsi, %rdx      # counter + 1
0x03a: 2027                 | rrmovq %rdx, %rdi    # copy counter
0x03c: 6117                 | subq %rcx, %rdi      # compare with target
0x03e: 722800000000000000   | jl 0x028             # continue loop
0x047: 00                   | halt`
      },
      {
        id: 'file-sum',
        name: 'sum.yo',
        type: 'file',
        content: `# Simple addition program
# Adds 10 and 20 and stores the result in %rbx
0x000: 30f00a00000000000000 | irmovq $10, %rax     # rax = 10
0x00a: 30f31400000000000000 | irmovq $20, %rbx     # rbx = 20
0x014: 6003                 | addq %rax, %rbx      # rbx = rax + rbx
0x016: 00                   | halt`
      }
    ]
  }
];

const FileExplorer = ({ onFileSelect, currentFileName }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['示例程序', '我的文件']));
  const [files, setFiles] = useState<FileItem[]>(SAMPLE_FILES);
  // 新增：用于存储用户上传的文件
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file' && file.content) {
      onFileSelect(file.content, file.name);
      toast.success(`已打开 ${file.name}`);
    }
  };

  // 处理上传按钮点击
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newFile: FileItem = {
        id: `user-file-${Date.now()}`,
        name: file.name,
        type: 'file',
        content: content
      };

      setUserFiles(prev => [...prev, newFile]);
      toast.success(`文件 ${file.name} 上传成功`);
      
      // 自动打开上传的文件
      onFileSelect(content, file.name);
    };
    reader.readAsText(file);
    // 重置 input value 以便重复上传同名文件
    event.target.value = '';
  };

  const handleNewFile = () => {
    const fileName = `new_file_${Date.now().toString().slice(-4)}.yo`;
    const newFile: FileItem = {
      id: `new-file-${Date.now()}`,
      name: fileName,
      type: 'file',
      content: `# New Y86-64 Program\n\n0x000: 00 | halt`
    };
    setUserFiles(prev => [...prev, newFile]);
    onFileSelect(newFile.content!, fileName);
    toast.success('新建文件成功');
  };

  const handleDeleteUserFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setUserFiles(prev => prev.filter(f => f.id !== id));
    toast.success('文件已删除');
  };

  const renderFileItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.name);
    const isActive = currentFileName === item.name;

    if (item.type === 'folder') {
      return (
        <div key={item.id}>
          <motion.div
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            onClick={() => toggleFolder(item.name)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded text-sm',
              'transition-colors select-none'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Folder className="w-4 h-4 text-cyan-400" />
            <span className="text-foreground">{item.name}</span>
          </motion.div>
          {isExpanded && item.children && (
            <div>
              {item.children.map((child) => renderFileItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <motion.div
        key={item.id}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        onClick={() => handleFileClick(item)}
        className={cn(
          'flex items-center justify-between gap-2 px-2 py-1.5 cursor-pointer rounded text-sm group',
          'transition-colors',
          isActive && 'bg-cyan-500/20 border-l-2 border-cyan-400'
        )}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className={cn('truncate', isActive ? 'text-cyan-400 font-medium' : 'text-foreground')}>
            {item.name}
          </span>
        </div>
        
        {/* 仅用户文件显示删除按钮 */}
        {item.id.startsWith('user-file') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
            onClick={(e) => handleDeleteUserFile(e, item.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#252526] border-r border-border">
      {/* 隐藏的文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".yo,.ys,.txt"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-[#252526]">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          资源管理器
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-white/10"
            onClick={handleNewFile}
            title="新建文件"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-white/10"
            onClick={handleUploadClick}
            title="上传文件"
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* 示例程序文件夹 */}
          {files.map((item) => renderFileItem(item))}
          
          {/* 我的文件文件夹 */}
          {renderFileItem({
            id: 'folder-user',
            name: '我的文件',
            type: 'folder',
            children: userFiles
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FileExplorer;
