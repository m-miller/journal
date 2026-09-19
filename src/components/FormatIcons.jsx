// Toolbar icons, drawn on a 24×24 grid. They use currentColor, so they follow
// the button's text color (including the dark active state and dark mode).

function Icon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const H = <path d="M3 6v12M11 6v12M3 12h8" />;

// Keys match the `key` of each toolbar button.
export const FORMAT_ICONS = {
  bold: (
    <Icon>
      <path strokeWidth="2.5" d="M7 5h5.5a3.5 3.5 0 0 1 0 7H7zM7 12h6.5a3.5 3.5 0 0 1 0 7H7z" />
    </Icon>
  ),
  italic: (
    <Icon>
      <path d="M10 5h8M6 19h8M14 5l-4 14" />
    </Icon>
  ),
  underline: (
    <Icon>
      <path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" />
    </Icon>
  ),
  strike: (
    <Icon>
      <path d="M16.5 7.5C16 5.9 14.3 5 12 5c-2.6 0-4.5 1.3-4.5 3.2 0 1.5 1 2.4 2.8 3M4 12h16M8 16.3C8.6 18 10.2 19 12.3 19c2.6 0 4.4-1.3 4.4-3.3 0-.9-.3-1.6-1-2.2" />
    </Icon>
  ),
  code: (
    <Icon>
      <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
    </Icon>
  ),
  heading: (
    <Icon>
      {H}
      <path d="M15 11a2.2 2.2 0 1 1 4.4 0c0 2.2-4.4 3.3-4.4 7h4.6" />
    </Icon>
  ),
  subheading: (
    <Icon>
      {H}
      <path d="M15 9.5h4.5l-2.6 3.2a2.6 2.6 0 1 1-1.8 4.6" />
    </Icon>
  ),
  bulletList: (
    <Icon>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  ),
  orderedList: (
    <Icon>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path strokeWidth="1.6" d="M4 4.8l1.5-.8v6M3.8 14.6a1.4 1.4 0 1 1 2.5.9L3.8 19h2.8" />
    </Icon>
  ),
  blockquote: (
    <Icon>
      <path d="M5 5v14M10 8h9M10 12h9M10 16h6" />
    </Icon>
  ),
  codeBlock: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M10 9.5L7.5 12l2.5 2.5M14 9.5l2.5 2.5-2.5 2.5" />
    </Icon>
  ),
  horizontalRule: (
    <Icon>
      <path d="M3 12h18" />
      <path strokeOpacity="0.4" d="M7 6.5h10M7 17.5h10" />
    </Icon>
  ),
  alignLeft: (
    <Icon>
      <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />
    </Icon>
  ),
  alignCenter: (
    <Icon>
      <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />
    </Icon>
  ),
  alignRight: (
    <Icon>
      <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />
    </Icon>
  ),
  alignJustify: (
    <Icon>
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </Icon>
  ),
  image: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-9 9" />
    </Icon>
  ),
    // Image positions (used in the image menu)
  positionLeft: (
    <Icon>
      <rect x="3" y="3" width="10" height="8" rx="1" />
      <path d="M3 16h18M3 20h12" />
    </Icon>
  ),
  positionCenter: (
    <Icon>
      <rect x="7" y="3" width="10" height="8" rx="1" />
      <path d="M3 16h18M6 20h12" />
    </Icon>
  ),
  positionWrapLeft: (
    <Icon>
      <rect x="3" y="3" width="9" height="9" rx="1" />
      <path d="M16 4h5M16 8h5M16 12h5M3 16h18M3 20h12" />
    </Icon>
  ),
  positionWrapRight: (
    <Icon>
      <rect x="12" y="3" width="9" height="9" rx="1" />
      <path d="M3 4h5M3 8h5M3 12h5M3 16h18M3 20h12" />
    </Icon>
  ),
  link: (
    <Icon>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
    </Icon>
  ),
};