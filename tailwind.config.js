// Configure Tailwind CDN safely before it loads
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      // extend theme here
    }
  }
};
