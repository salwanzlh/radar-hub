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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function ToolbarButton({
  editor,
  action,
  isActive,
  icon: Icon,
  title,
  disabled,
}: {
  editor: Editor;
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
        editor={editor}
        action={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        icon={Bold}
        title="Bold"
      />
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        icon={Italic}
        title="Italic"
      />
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        icon={UnderlineIcon}
        title="Underline"
      />

      <ToolbarSeparator />

      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        icon={Heading2}
        title="Heading 2"
      />
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        icon={Heading3}
        title="Heading 3"
      />

      <ToolbarSeparator />

      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        icon={List}
        title="Bullet List"
      />
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        icon={ListOrdered}
        title="Numbered List"
      />

      <ToolbarSeparator />

      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        icon={Quote}
        title="Blockquote"
      />
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus}
        title="Horizontal Rule"
      />

      <ToolbarSeparator />

      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        icon={Undo2}
        title="Undo"
      />
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        icon={Redo2}
        title="Redo"
      />
    </div>
  );
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  disabled = false,
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
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 min-h-[400px] max-h-[500px] overflow-y-auto focus-within:ring-1 focus-within:ring-brand-accent/25 text-text-primary [&_.tiptap]:outline-none [&_.tiptap]:min-h-[380px] [&_.tiptap_p.is-editor-empty:first-child::before]:text-text-tertiary [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}

export type { MarkdownEditorProps };
