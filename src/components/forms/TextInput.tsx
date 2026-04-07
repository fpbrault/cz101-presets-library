import type { InputHTMLAttributes } from 'react'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md' | 'lg'
}

export default function TextInput({
  inputSize = 'md',
  className = '',
  ...props
}: TextInputProps) {
  return (
    <input
      className={`input input-bordered input-${inputSize} w-full ${className}`.trim()}
      {...props}
    />
  )
}