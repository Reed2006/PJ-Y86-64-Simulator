import { useEffect, useRef } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { Breakpoint } from '@/lib/y86/types';

interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  breakpoints: Breakpoint[];
  onBreakpointToggle: (address: number) => void;
  currentPC: number;
}

const MonacoCodeEditor = ({
  value,
  onChange,
  breakpoints,
  onBreakpointToggle,
  currentPC
}: MonacoCodeEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // 提取地址从汇编代码行
  const extractAddress = (line: string): number | null => {
    const match = line.match(/0x([0-9a-fA-F]+):/);
    return match ? parseInt(match[1], 16) : null;
  };

  // 处理编辑器挂载
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 注册自定义语言（简单的 Y86 高亮）
    monaco.languages.register({ id: 'y86' });
    monaco.languages.setMonarchTokensProvider('y86', {
      tokenizer: {
        root: [
          [/0x[0-9a-fA-F]+:/, 'address'],
          [/%r[a-z0-9]+/, 'register'],
          [/\b(halt|nop|rrmovq|irmovq|rmmovq|mrmovq|addq|subq|andq|xorq|jmp|jle|jl|je|jne|jge|jg|call|ret|pushq|popq)\b/, 'keyword'],
          [/0x[0-9a-fA-F]+/, 'number'],
          [/\$-?[0-9]+/, 'number'],
          [/#.*$/, 'comment'],
        ],
      },
    });

    // 定义颜色主题
    monaco.editor.defineTheme('y86-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'address', foreground: 'FFD700', fontStyle: 'bold' },
        { token: 'register', foreground: '7EC8E3' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2a2a',
        'editorLineNumber.foreground': '#858585',
        'editorGutter.background': '#1e1e1e',
      },
    });

    monaco.editor.setTheme('y86-dark');

    // 监听断点点击（glyph margin）
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          const lineContent = editor.getModel()?.getLineContent(lineNumber);
          if (lineContent) {
            const address = extractAddress(lineContent);
            if (address !== null) {
              onBreakpointToggle(address);
            }
          }
        }
      }
    });
  };

  // 更新装饰器（断点标记和当前行高亮）
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    const newDecorations: editor.IModelDeltaDecoration[] = [];
    const lineCount = model.getLineCount();

    // 为每一行检查断点和当前PC
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      const lineContent = model.getLineContent(lineNumber);
      const address = extractAddress(lineContent);

      if (address !== null) {
        // 检查断点
        const breakpoint = breakpoints.find(bp => bp.address === address);
        if (breakpoint) {
          newDecorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: false,
              glyphMarginClassName: breakpoint.enabled 
                ? 'breakpoint-glyph-enabled'
                : 'breakpoint-glyph-disabled',
              glyphMarginHoverMessage: { value: breakpoint.enabled ? '断点已启用' : '断点已禁用' },
            },
          });
        }

        // 检查当前执行行
        if (address === currentPC) {
          newDecorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className: 'current-line-highlight',
              glyphMarginClassName: 'current-line-glyph',
            },
          });
        }
      }
    }

    // 应用装饰器
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [breakpoints, currentPC]);

  // 样式注入
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .breakpoint-glyph-enabled {
        background: radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0.4) 70%);
        width: 12px !important;
        height: 12px !important;
        border-radius: 50%;
        margin-left: 4px;
        margin-top: 4px;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
      }
      .breakpoint-glyph-disabled {
        background: rgba(100, 100, 100, 0.5);
        width: 12px !important;
        height: 12px !important;
        border-radius: 50%;
        margin-left: 4px;
        margin-top: 4px;
        border: 1px solid rgba(150, 150, 150, 0.6);
      }
      .current-line-glyph {
        background: linear-gradient(90deg, rgba(168, 85, 247, 0.8) 0%, transparent 100%);
        width: 4px !important;
        margin-left: 0px;
      }
      .current-line-highlight {
        background: rgba(168, 85, 247, 0.15) !important;
        border-left: 3px solid rgba(168, 85, 247, 0.8);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="y86"
        value={value}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Fira Code', 'Courier New', monospace",
          lineNumbers: 'on',
          glyphMargin: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly: false,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          wordWrap: 'off',
          renderLineHighlight: 'all',
          cursorStyle: 'line',
          cursorBlinking: 'smooth',
        }}
      />
    </div>
  );
};

export default MonacoCodeEditor;
