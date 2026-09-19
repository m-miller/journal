import { Extension } from '@tiptap/react';

// True when the cursor is in a regular paragraph (not in a list, where Tab nests items).
function inParagraph(editor) {
  return editor.state.selection.$from.parent.type.name === 'paragraph' && !editor.isActive('listItem');
}

// Book-style first-line indent for paragraphs: Tab turns it on, Shift+Tab turns it off.
// Saved as an `indent` attribute on the paragraph and shown with the `data-indent` CSS rule.
export const FirstLineIndent = Extension.create({
  name: 'firstLineIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          indent: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-indent') === 'true',
            renderHTML: (attributes) => (attributes.indent ? { 'data-indent': 'true' } : {}),
          },
        },
      },
    ];
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!inParagraph(this.editor)) return false;
        this.editor.commands.updateAttributes('paragraph', { indent: true });
        return true; // keep focus in the editor
      },
      'Shift-Tab': () => {
        // On a paragraph that isn't indented, Shift+Tab moves focus out of the editor as usual.
        if (!inParagraph(this.editor) || !this.editor.getAttributes('paragraph').indent) return false;
        return this.editor.commands.updateAttributes('paragraph', { indent: false });
      },
    };
  },
});