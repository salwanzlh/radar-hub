import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Wand2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useCallback, useState, useRef } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onReviseSelection?: (selectedText: string, instruction: string) => Promise<string>;
  isRevising?: boolean;
}

function ToolbarButton({
  action,
  isActive,
  icon: Icon,
  title,
  disabled,
}: {
  action: () => void;
  isActive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={action}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors disabled:opacity-40",
        isActive
          ? "bg-brand-accent/15 text-brand-accent"
          : "text-text-tertiary hover:text-text-secondary hover:bg-surface-100"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-surface-200 mx-0.5" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-surface-200 bg-surface-50 rounded-t-xl flex-wrap">
      <ToolbarButton
        action={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        icon={Bold}
        title="Bold"
      />
      <ToolbarButton
        action={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        icon={Italic}
        title="Italic"
      />
      <ToolbarButton
        action={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        icon={UnderlineIcon}
        title="Underline"
      />

      <ToolbarSeparator />

      <ToolbarButton
        action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        icon={Heading2}
        title="Heading 2"
      />
      <ToolbarButton
        action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        icon={Heading3}
        title="Heading 3"
      />

      <ToolbarSeparator />

      <ToolbarButton
        action={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        icon={List}
        title="Bullet List"
      />
      <ToolbarButton
        action={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        icon={ListOrdered}
        title="Numbered List"
      />

      <ToolbarSeparator />

      <ToolbarButton
        action={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        icon={Quote}
        title="Blockquote"
      />
      <ToolbarButton
        action={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus}
        title="Horizontal Rule"
      />

      <ToolbarSeparator />

      <ToolbarButton
        action={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        icon={Undo2}
        title="Undo"
      />
      <ToolbarButton
        action={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        icon={Redo2}
        title="Redo"
      />
    </div>
  );
}

function ReviseSelectionBubble({
  editor,
  onRevise,
  isRevising,
}: {
  editor: Editor;
  onRevise: (selectedText: string, instruction: string) => Promise<string>;
  isRevising: boolean;
}) {
  const [showInput, setShowInput] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const savedSelectionRef = useRef<{ from: number; to: number; text: string } | null>(null);

  useEffect(() => {
    function updateSelection() {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setHasSelection(false);
        // Don't hide bubble if input is open (user clicked into input, selection lost)
        if (!showInput && !isRevising) setBubblePos(null);
        return;
      }
      setHasSelection(true);

      // Position below the selection end so it doesn't cover selected text
      const endCoords = editor.view.coordsAtPos(to);
      setBubblePos({ top: endCoords.bottom + 8, left: endCoords.left });
    }

    editor.on("selectionUpdate", updateSelection);
    return () => { editor.off("selectionUpdate", updateSelection); };
  }, [editor, showInput, isRevising]);

  function handleOpenInput() {
    // Save selection before focus moves to input
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, "\n");
    savedSelectionRef.current = { from, to, text };
    setInstruction("");
    setShowInput(true);
  }

  function handleClose() {
    setShowInput(false);
    setInstruction("");
    setBubblePos(null);
    savedSelectionRef.current = null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() || !savedSelectionRef.current) return;
    const { from, to, text } = savedSelectionRef.current;
    const revised = await onRevise(text, instruction);
    // Replace the saved selection range with revised content
    editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(revised).run();
    handleClose();
  }

  if (!bubblePos || (!hasSelection && !showInput && !isRevising)) return null;

  return (
    <div
      className="fixed z-50"
      style={{ top: bubblePos.top, left: bubblePos.left }}
    >
      {showInput ? (
        <div className="relative bg-surface-white border border-surface-200 rounded-xl shadow-xl p-3 w-80">
          {isRevising && (
            <div className="absolute inset-0 bg-surface-white/80 backdrop-blur-[1px] rounded-xl z-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
              <span className="text-[11px] font-medium text-text-secondary">Revising selection...</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <p className="text-[11px] font-medium text-text-tertiary mb-2">
              Revise selected text:
            </p>
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., ubah tone lebih formal"
              autoFocus
              disabled={isRevising}
              className="w-full px-3 py-2 bg-surface-100 border border-surface-200 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-accent/50 disabled:opacity-60 transition-colors mb-2"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isRevising}
                className="px-3 py-1.5 text-xs text-text-secondary border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!instruction.trim() || isRevising}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-accent text-text-inverse font-semibold rounded-lg hover:bg-brand-accent-hover disabled:opacity-60 transition-colors"
              >
                <Wand2 className="w-3 h-3" />
                Revise
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={handleOpenInput}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent text-text-inverse shadow-lg hover:bg-brand-accent-hover transition-colors"
        >
          <Wand2 className="w-3 h-3" />
          Revise Selection
        </button>
      )}
    </div>
  );
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  disabled = false,
  onReviseSelection,
  isRevising = false,
}: MarkdownEditorProps) {
  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      onChange(md);
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: handleUpdate,
  });

  // Sync external value changes (e.g., AI revision result)
  useEffect(() => {
    if (!editor) return;
    const currentMd = editor.storage.markdown.getMarkdown();
    if (currentMd !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Sync disabled state
  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  return (
    <div className={cn("border border-surface-200 rounded-xl overflow-hidden", disabled && "opacity-60", className)}>
      <Toolbar editor={editor} />
      {onReviseSelection && (
        <ReviseSelectionBubble editor={editor} onRevise={onReviseSelection} isRevising={isRevising} />
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 min-h-[400px] max-h-[500px] overflow-y-auto focus-within:ring-1 focus-within:ring-brand-accent/25 text-text-primary [&_.tiptap]:outline-none [&_.tiptap]:min-h-[380px] [&_.tiptap_p.is-editor-empty:first-child::before]:text-text-tertiary [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}

export type { MarkdownEditorProps };
