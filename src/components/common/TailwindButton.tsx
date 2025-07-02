import React from 'react';

interface TailwindButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const TailwindButton: React.FC<TailwindButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = ''
}) => {
  // 基础样式
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-fast
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${disabled ? '' : 'hover:shadow-lg active:scale-95'}
  `;

  // 变体样式
  const variantClasses = {
    primary: `
      bg-primary hover:bg-primary-hover text-white 
      focus:ring-primary/50 shadow-sm
    `,
    success: `
      bg-success hover:bg-green-600 text-white 
      focus:ring-success/50 shadow-sm
    `,
    warning: `
      bg-warning hover:bg-yellow-500 text-white 
      focus:ring-warning/50 shadow-sm
    `,
    error: `
      bg-error hover:bg-red-600 text-white 
      focus:ring-error/50 shadow-sm
    `,
    outline: `
      border-2 border-primary text-primary bg-transparent
      hover:bg-primary hover:text-white
      focus:ring-primary/50
    `
  };

  // 尺寸样式
  const sizeClasses = {
    sm: 'px-sm py-xs text-sm h-8',
    md: 'px-md py-sm text-base h-10',
    lg: 'px-lg py-md text-lg h-12'
  };

  const combinedClasses = `
    ${baseClasses} 
    ${variantClasses[variant]} 
    ${sizeClasses[size]} 
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <button
      className={combinedClasses}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

export default TailwindButton; 