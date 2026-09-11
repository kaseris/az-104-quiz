// Opt-in tactile feedback for infrequent study actions.
export default function ActionButton({ static: isStatic = false, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`study-action ${className}`}
      data-static={isStatic || undefined}
    />
  );
}
