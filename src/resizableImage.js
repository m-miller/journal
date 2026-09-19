import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageView from './components/ImageView.jsx';

// The standard image extension, plus a `widthPercent` attribute
// (share of the writing width; empty means the image's natural size)
// and the ImageView component for the size menu and drag handle.
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      widthPercent: {
        default: null,
        parseHTML: (element) => {
          const value = parseFloat(element.getAttribute('data-width-percent'));
          return Number.isFinite(value) ? value : null;
        },
        renderHTML: (attributes) =>
          attributes.widthPercent
            ? { 'data-width-percent': attributes.widthPercent, style: `width: ${attributes.widthPercent}%` }
            : {},
      },
      // null = own line on the left; 'center'; 'wrapLeft'; 'wrapRight'
      position: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-position'),
        renderHTML: (attributes) => (attributes.position ? { 'data-position': attributes.position } : {}),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});