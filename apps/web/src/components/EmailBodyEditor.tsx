"use client";
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Node } from "@tiptap/core";
import { Bold, Italic, Underline as UnderlineIcon, Link2, Heading1, Heading2, AlignLeft, AlignCenter } from "lucide-react";

// ─── Custom block nodes ───────────────────────────────────────────────────────

const HeroBlock = Node.create({
  name: "heroBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      headline: { default: "Your Headline Here" },
      subtext: { default: "Supporting text goes here" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="heroBlock"]' }];
  },

  renderHTML({ node }) {
    return [
      "div",
      {
        "data-type": "heroBlock",
        style:
          "background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:40px 24px;text-align:center;border-radius:8px;margin:0 0 16px",
      },
      [
        "h1",
        {
          style:
            "color:#ffffff;font-size:26px;font-weight:700;margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        },
        node.attrs.headline,
      ],
      [
        "p",
        {
          style:
            "color:rgba(255,255,255,0.8);margin:0;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        },
        node.attrs.subtext,
      ],
    ];
  },
});

const FooterBlock = Node.create({
  name: "footerBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="footerBlock"]' }];
  },

  renderHTML() {
    return [
      "div",
      {
        "data-type": "footerBlock",
        style: "border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;text-align:center",
      },
      [
        "p",
        { style: "font-size:12px;color:#6b7280;margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,sans-serif" },
        "© 2026 Your Company · All rights reserved",
      ],
      [
        "p",
        { style: "font-size:12px;color:#9ca3af;margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif" },
        "123 Street, City, State ZIP",
      ],
    ];
  },
});

const AddressBlock = Node.create({
  name: "addressBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'p[data-type="addressBlock"]' }];
  },

  renderHTML() {
    return [
      "p",
      {
        "data-type": "addressBlock",
        style:
          "font-size:12px;color:#6b7280;margin:16px 0;line-height:1.8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;border-top:1px solid #f3f4f6;padding-top:12px",
      },
      "Your Company Name · 123 Street · City, State ZIP · Country",
    ];
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function textToHtml(text: string): string {
  if (!text) return "";
  if (text.trim().startsWith("<")) return text;
  return text
    .split(/\n\n+/)
    .map((para) =>
      `<p>${para
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function TBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`flex items-center justify-center h-6 rounded px-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-500/30 text-brand-300"
          : "text-white/50 hover:text-white/90 hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function EmailBodyEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your email body…" }),
      HeroBlock,
      FooterBlock,
      AddressBlock,
    ],
    content: textToHtml(value),
    editorProps: { attributes: { class: "focus:outline-none" } },
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
    immediatelyRender: false,
  });

  // Reset when value cleared externally (form reset)
  useEffect(() => {
    if (!editor) return;
    if (!value && editor.getHTML() !== "<p></p>") {
      editor.commands.setContent("");
    }
  }, [value, editor]);

  function insertHero() {
    editor?.chain().focus().insertContent({ type: "heroBlock" }).run();
  }

  function insertImage() {
    const url = window.prompt("Image URL:");
    if (url) editor?.chain().focus().setImage({ src: url, alt: "" }).run();
  }

  function insertFooter() {
    editor?.chain().focus().insertContent({ type: "footerBlock" }).run();
  }

  function insertAddress() {
    editor?.chain().focus().insertContent({ type: "addressBlock" }).run();
  }

  function handleLink() {
    const existing = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL:", existing || "https://");
    if (url === null) return;
    if (!url) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.04] overflow-hidden focus-within:ring-2 focus-within:ring-brand-400/40 focus-within:border-brand-400/50 transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-white/[0.07] flex-wrap">
        {/* Format */}
        <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={12} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={12} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon size={12} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 size={13} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 size={13} />
        </TBtn>
        <TBtn onClick={handleLink} active={editor.isActive("link")} title="Link">
          <Link2 size={12} />
        </TBtn>

        <div className="w-px h-3.5 bg-white/[0.1] mx-1" />

        {/* Align */}
        <TBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <AlignLeft size={12} />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
          <AlignCenter size={12} />
        </TBtn>

        <div className="w-px h-3.5 bg-white/[0.1] mx-1" />

        {/* Block insertions */}
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mr-0.5">Insert</span>
        <TBtn onClick={insertHero} title="Hero banner">Hero</TBtn>
        <TBtn onClick={insertImage} title="Image from URL">Image</TBtn>
        <TBtn onClick={insertFooter} title="Footer block">Footer</TBtn>
        <TBtn onClick={insertAddress} title="Address block">Address</TBtn>
      </div>

      {/* Editor content area */}
      <div className="px-4 py-3">
        <EditorContent
          editor={editor}
          className={[
            "text-sm text-white/85",
            "[&_.tiptap]:min-h-[180px] [&_.tiptap]:focus:outline-none",
            "[&_.tiptap_p]:my-1.5 [&_.tiptap_p]:leading-relaxed",
            "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:my-2 [&_.tiptap_h1]:text-white",
            "[&_.tiptap_h2]:text-lg [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:my-2 [&_.tiptap_h2]:text-white",
            "[&_.tiptap_a]:text-brand-400 [&_.tiptap_a]:underline",
            "[&_.tiptap_strong]:font-bold [&_.tiptap_em]:italic [&_.tiptap_u]:underline",
            "[&_.tiptap_img]:max-w-full [&_.tiptap_img]:rounded-xl [&_.tiptap_img]:my-2",
            "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5",
            // Placeholder
            "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:text-white/25",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:float-left",
            "[&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
