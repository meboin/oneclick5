import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant of the button. Controls background and border styling.
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Size of the button. Affects padding and font size.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Contents to render inside the button. Accepts plain text or JSX.
   */
  children: ReactNode;
}

/**
 * Reusable button component. Provides a few preset variants and sizes to
 * standardise styling across the application. Additional class names
 * supplied via the `className` prop will be appended to allow further
 * customisation. All other props are passed through to the underlying
 * <button> element.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses =
    'whitespace-nowrap cursor-pointer font-medium rounded-lg transition-colors duration-200 flex items-center justify-center';
  const variantClasses: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100'
  };
  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}