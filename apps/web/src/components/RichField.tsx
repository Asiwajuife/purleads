"use client";
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useTheme } from "./ThemeProvider";

interface RichFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  singleLine?: boolean;
  className?: string;
}

export default function RichField({ value, onChange, placeholder, singleLine = true, className }: RichFieldProps) {
  const { theme } = useTheme();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // In single-line mode disable block-level extensions
        ...(singleLine ? { heading: false, codeBlock: false, bulletList: false, orderedList: false, blockquote: false, horizontalRule: false } : {}),
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        ...(singleLine ? { "data-single-line": "true" } : {}),
      },
      handleKeyDown(_view, event) {
        if (singleLine && event.key === "Enter") {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor: e }) {
      onChange(e.getText());
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    if (editor.getText() !== value) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  return (
    <div
      className={
        className ??
        (theme === "dark"
          ? "w-full border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.06] text-white/90 transition-all " +
            "focus-within:ring-2 focus-within:ring-brand-400/40 focus-within:border-brand-400/50 " +
            "[&_.tiptap]:min-h-[1.25rem] [&_.tiptap_p]:m-0 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] " +
            "[&_.tiptap_p.is-editor-empty:first-child::before]:text-white/25 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none " +
            "[&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
          : "w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-900 transition-all " +
            "focus-within:ring-2 focus-within:ring-brand-400/40 focus-within:border-brand-400 " +
            "[&_.tiptap]:min-h-[1.25rem] [&_.tiptap_p]:m-0 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] " +
            "[&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none " +
            "[&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0")
      }
    >
      <EditorContent editor={editor} />
    </div>
  );
}
