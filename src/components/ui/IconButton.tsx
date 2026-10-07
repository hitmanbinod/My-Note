import { ButtonHTMLAttributes, forwardRef } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'ghost' | 'primary' | 'danger';
  /** sm = 32px (top bars), md = 36px (formatting toolbar, UpNote-sized). */
  size?: 'sm' | 'md';
  /** Keep the default mousedown (needed for HTML5 drag handles). */
  skipMouseDownPrevent?: boolean;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'ghost', size = 'sm', className = '', onMouseDown, skipMouseDownPrevent, ...props }, ref) => {
    const variantStyles = {
      ghost: 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]',
      primary: 'bg-[var(--brand-soft)] text-[var(--brand)] hover:brightness-97',
      danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
    };
    const sizeStyles = size === 'md'
      ? 'h-9 w-9 [&>svg]:h-[19px] [&>svg]:w-[19px] [&>svg span]:text-[11px]'
      : 'h-8 w-8 [&>svg]:h-[17px] [&>svg]:w-[17px]';

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        /* Keep the editor's selection alive: a toolbar click must not move focus
           before the command runs (how Docs/Notion/UpNote toolbars behave).
           Skip it for drag handles — preventDefault on mousedown cancels HTML5
           drag-and-drop. */
        onMouseDown={(event) => {
          if (event.button === 0 && !skipMouseDownPrevent) event.preventDefault();
          onMouseDown?.(event);
        }}
        className={`pressable flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] disabled:pointer-events-none disabled:opacity-40 ${sizeStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
