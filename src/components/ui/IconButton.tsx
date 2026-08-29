import { ButtonHTMLAttributes, forwardRef } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'ghost' | 'primary' | 'danger';
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'ghost', className = '', ...props }, ref) => {
    const variantStyles = {
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      primary: 'hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 dark:text-primary-400',
      danger: 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
