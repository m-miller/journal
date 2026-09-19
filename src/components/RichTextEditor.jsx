import { useRef, useState } from 'react';
import { EditorContent, Extension, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import TextAlign from '@tiptap/extension-text-align';
import { FirstLineIndent } from '../firstLineIndent.js';
import { FORMAT_ICONS } from './FormatIcons.jsx';
import { ResizableImage } from '../resizableImage.js';
import { shrinkImage } from '../shrinkImage.js';
import FileHandler from '@tiptap/extension-file-handler';
import { uploadImage } from '../storage.js';
import { parseBody, serializeDoc } from '../richText.js';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

// Shortcut hints for button tooltips, e.g. "⌘B" on Mac, "Ctrl+B" elsewhere.
function shortcut(key, { shift = false, alt = false } = {}) {
  if (isMac) return `⌘${alt ? '⌥' : ''}${shift ? '⇧' : ''}${key}`;
  return `Ctrl+${alt ? 'Alt+' : ''}${shift ? 'Shift+' : ''}${key}`;
}

function promptForLink(editor) {
  const current = editor.getAttributes('link').href || '';
  const input = window.prompt('Link address (leave empty to remove the link)', current);
  if (input === null) return; // cancelled

  const url = input.trim();
  if (!url) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  const href = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;

  if (editor.state.selection.empty && !editor.isActive('link')) {
    // Nothing selected: insert the address itself as a link.
    editor
      .chain()
      .focus()
      .insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href } }] })
      .run();
  } else {
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }
}

// Adds Cmd/Ctrl+K for links (the other shortcuts are built into the editor).
const LinkShortcut = Extension.create({
  name: 'linkShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        promptForLink(this.editor);
        return true;
      },
    };
  },
});

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB, same limit as the server

// After inserting an image the editor leaves it selected, so typing would replace it.
// This moves the cursor to an empty line after the image, adding one if there isn't one.
function moveCursorAfterImage(editor) {
  const { selection } = editor.state;
  if (selection.node?.type.name !== 'image') return;
  const after = selection.to;
  const next = editor.state.doc.resolve(after).nodeAfter;
  if (next?.isTextblock && next.content.size === 0) {
    editor.commands.setTextSelection(after + 1);
  } else {
    editor.chain().insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1).run();
  }
}

// Asks for alt text, uploads each file, and inserts it: at `pos` for a drop,
// otherwise at the cursor. Reports progress and problems through `setStatus`.
async function addImages(editor, entryId, files, pos, setStatus) {
  let failed = false;
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setStatus({ message: `"${file.name}" isn't a JPEG, PNG, GIF, or WebP image.`, isError: true });
      failed = true;
      continue;
    }
    const alt = window.prompt(`Describe "${file.name}" for screen readers (optional). Cancel to skip this image.`, '');
    if (alt === null) continue;

    setStatus({ message: `Preparing "${file.name}"…`, isError: false });
    const upload = await shrinkImage(file);
    if (upload.size > MAX_IMAGE_BYTES) {
      setStatus({ message: `"${file.name}" is larger than 10 MB.`, isError: true });
      failed = true;
      continue;
    }

    setStatus({ message: `Uploading "${file.name}"…`, isError: false });
    try {
      const { url } = await uploadImage(entryId, upload);
      if (editor.isDestroyed) return; // switched to another entry during the upload
      const image = { type: 'image', attrs: { src: url, alt: alt.trim() || null } };
      if (typeof pos === 'number') {
        editor.chain().focus().insertContentAt(Math.min(pos, editor.state.doc.content.size), image).run();
        pos = undefined; // any further files go after this one
      } else {
        editor.chain().focus().insertContent(image).run();
      }
      moveCursorAfterImage(editor);
    } catch (err) {
      setStatus({ message: `Couldn't add "${file.name}". ${err.message}`, isError: true });
      failed = true;
    }
  }
  if (!failed) setStatus(null);
}

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false, defaultProtocol: 'https' },
  }),
  Placeholder.configure({ placeholder: 'Start writing…' }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  FirstLineIndent,
  LinkShortcut,
  ResizableImage,,
];

// `value` is only read when the editor is created. The parent remounts this
// component for each entry (via `key`), so it doesn't need to sync afterwards.
export default function RichTextEditor({ entryId, value, onChange, autoFocus }) {
  const [imageStatus, setImageStatus] = useState(null); // { message, isError }
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  dropRef.current = (editor, files, pos) => addImages(editor, entryId, files, pos, setImageStatus);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      ...extensions,
      FileHandler.configure({ onDrop: (editor, files, pos) => dropRef.current(editor, files, pos) }),
    ],
    content: parseBody(value),
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'rich-editor',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Entry',
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(serializeDoc(editor.getJSON())),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strike: editor.isActive('strike'),
            code: editor.isActive('code'),
            heading: editor.isActive('heading', { level: 2 }),
            subheading: editor.isActive('heading', { level: 3 }),
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            blockquote: editor.isActive('blockquote'),
            codeBlock: editor.isActive('codeBlock'),
            link: editor.isActive('link'),
            alignLeft: editor.isActive({ textAlign: 'left' }),
            alignCenter: editor.isActive({ textAlign: 'center' }),
            alignRight: editor.isActive({ textAlign: 'right' }),
            alignJustify: editor.isActive({ textAlign: 'justify' }),
          }
        : {},
  });

  if (!editor) return null;

  const buttons = [
    { key: 'bold', label: 'Bold', hint: shortcut('B'), run: () => editor.chain().focus().toggleBold().run() },
    { key: 'italic', label: 'Italic', hint: shortcut('I'), run: () => editor.chain().focus().toggleItalic().run() },
    { key: 'underline', label: 'Underline', hint: shortcut('U'), run: () => editor.chain().focus().toggleUnderline().run() },
    { key: 'strike', label: 'Strikethrough', hint: shortcut('S', { shift: true }), run: () => editor.chain().focus().toggleStrike().run() },
    { key: 'code', label: 'Code', hint: shortcut('E'), run: () => editor.chain().focus().toggleCode().run() },
    { key: 'heading', label: 'Heading', hint: shortcut('2', { alt: true }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: 'subheading', label: 'Subheading', hint: shortcut('3', { alt: true }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: 'bulletList', label: 'Bulleted list', hint: shortcut('8', { shift: true }), run: () => editor.chain().focus().toggleBulletList().run() },
    { key: 'orderedList', label: 'Numbered list', hint: shortcut('7', { shift: true }), run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: 'blockquote', label: 'Quote', hint: shortcut('B', { shift: true }), run: () => editor.chain().focus().toggleBlockquote().run() },
    { key: 'codeBlock', label: 'Code block', hint: shortcut('C', { alt: true }), run: () => editor.chain().focus().toggleCodeBlock().run() },
    { key: 'horizontalRule', label: 'Divider', hint: 'or type --- on an empty line', run: () => editor.chain().focus().setHorizontalRule().run() },
    { key: 'image', label: 'Image', hint: 'or drag it into the entry', run: () => fileInputRef.current?.click() },
    { key: 'link', label: 'Link', hint: shortcut('K'), run: () => promptForLink(editor) },
    { key: 'alignLeft', label: 'Align left', hint: shortcut('L', { shift: true }), run: () => editor.chain().focus().setTextAlign('left').run() },
    { key: 'alignCenter', label: 'Center', hint: shortcut('E', { shift: true }), run: () => editor.chain().focus().setTextAlign('center').run() },
    { key: 'alignRight', label: 'Align right', hint: shortcut('R', { shift: true }), run: () => editor.chain().focus().setTextAlign('right').run() },
    { key: 'alignJustify', label: 'Justify', hint: shortcut('J', { shift: true }), run: () => editor.chain().focus().setTextAlign('justify').run() },
  ];

  return (
    <div className="rich-editor-wrap">
      <div className="format-toolbar" role="toolbar" aria-label="Formatting">
        {buttons.map((b) => (
          <button
            type="button"
            key={b.key}
            className={`format-button format-${b.key} ${active?.[b.key] ? 'format-active' : ''}`}
            aria-pressed={active && b.key in active ? Boolean(active[b.key]) : undefined}
            aria-label={b.label}
            title={`${b.label} (${b.hint})`}
            onMouseDown={(e) => e.preventDefault()} // keep focus (and the cursor) in the editor
            onClick={b.run}
          >
            {FORMAT_ICONS[b.key]}
          </button>
        ))}
      </div>
            <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        multiple
        hidden
        onChange={(e) => {
          const files = [...e.target.files];
          e.target.value = ''; // allow choosing the same file again
          addImages(editor, entryId, files, undefined, setImageStatus);
        }}
      />
      {imageStatus && (
        <p className={`image-status ${imageStatus.isError ? 'error' : ''}`} role={imageStatus.isError ? 'alert' : 'status'}>
          {imageStatus.message}
          {imageStatus.isError && (
            <button type="button" className="text-button" onClick={() => setImageStatus(null)}>
              Dismiss
            </button>
          )}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
