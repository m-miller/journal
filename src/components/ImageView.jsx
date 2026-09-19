import { useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { FORMAT_ICONS } from './FormatIcons.jsx';

// Preset widths, as a percentage of the writing area's width.
const SIZES = [
  { label: 'Small', value: 33 },
  { label: 'Medium', value: 50 },
  { label: 'Full width', value: 100 },
];

// Positions. `null` (own line, on the left) is the default for every image.
const POSITIONS = [
  { label: 'Own line, left', value: null, icon: 'positionLeft' },
  { label: 'Centered', value: 'center', icon: 'positionCenter' },
  { label: 'Wrap text, image on the left', value: 'wrapLeft', icon: 'positionWrapLeft' },
  { label: 'Wrap text, image on the right', value: 'wrapRight', icon: 'positionWrapRight' },
];

const MIN_PERCENT = 10;

// How each image is shown in the editor: the image itself, plus a size/position
// menu and a drag handle while it's selected. Saved as `widthPercent` and `position`.
export default function ImageView({ node, updateAttributes, selected, editor }) {
  const frameRef = useRef(null);
  const [dragPercent, setDragPercent] = useState(null); // live width while dragging
  const width = dragPercent ?? node.attrs.widthPercent;
  const position = node.attrs.position;

  // Right-wrapped images are anchored on the right, so their handle is on the left.
  const handleOnLeft = position === 'wrapRight';

  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    const areaWidth = editor.view.dom.clientWidth;
    const startWidth = frameRef.current.getBoundingClientRect().width;
    const startX = e.clientX;
    const direction = handleOnLeft ? -1 : 1;
    const factor = position === 'center' ? 2 : 1; // centered images grow on both sides
    let latest = null;

    const onMove = (ev) => {
      const newWidth = startWidth + (ev.clientX - startX) * direction * factor;
      const percent = Math.round((newWidth / areaWidth) * 100);
      latest = Math.min(100, Math.max(MIN_PERCENT, percent));
      setDragPercent(latest);
    };
    const onEnd = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      if (latest !== null) updateAttributes({ widthPercent: latest });
      setDragPercent(null);
    };

    handle.setPointerCapture(e.pointerId);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  }

  const keepSelection = (e) => e.preventDefault(); // clicking the menu keeps the image selected

  return (
    <NodeViewWrapper
      className={`image-node position-${position || 'left'}`}
      style={width ? { width: `${width}%` } : undefined}
    >
      <div ref={frameRef} className={`image-frame ${width ? 'has-width' : ''} ${selected ? 'is-selected' : ''}`}>
        <img src={node.attrs.src} alt={node.attrs.alt || ''} draggable={false} />

        {selected && editor.isEditable && (
          <>
            <div className="image-menu" contentEditable={false}>
              <div role="group" aria-label="Image size" className="image-menu-group">
                {SIZES.map((size) => (
                  <button
                    type="button"
                    key={size.value}
                    aria-pressed={node.attrs.widthPercent === size.value}
                    onMouseDown={keepSelection}
                    onClick={() => updateAttributes({ widthPercent: size.value })}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Image position" className="image-menu-group">
                {POSITIONS.map((option) => (
                  <button
                    type="button"
                    key={option.icon}
                    className="image-menu-icon"
                    aria-label={option.label}
                    title={option.label}
                    aria-pressed={position === option.value}
                    onMouseDown={keepSelection}
                    onClick={() => updateAttributes({ position: option.value })}
                  >
                    {FORMAT_ICONS[option.icon]}
                  </button>
                ))}
              </div>
            </div>
            <span
              className={`image-resize-handle ${handleOnLeft ? 'on-left' : ''}`}
              contentEditable={false}
              title="Drag to resize"
              aria-hidden="true"
              onPointerDown={startResize}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}