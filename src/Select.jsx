import { ChevronDown } from 'lucide-react';

// Keep native selection and keyboard behavior, with a consistently inset indicator.
export default function Select({ children, ...props }) {
  return (
    <span className="select-field">
      <select {...props}>{children}</select>
      <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}
