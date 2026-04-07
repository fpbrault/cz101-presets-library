import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'error'
    | 'info'
    | 'success'
    | 'neutral'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const base = 'btn'
  const variantClass = `btn-${variant}`
  const sizeClass = `btn-${size}`
  return (
    <button
      className={`${base} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
