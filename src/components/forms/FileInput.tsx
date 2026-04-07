import type { InputHTMLAttributes } from 'react'

interface FileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md' | 'lg'
  tone?: 'primary' | 'secondary' | 'accent' | 'neutral'
}

export default function FileInput({
  inputSize = 'md',
  tone = 'neutral',
  className = '',
  ...props
}: FileInputProps) {
  return (
    <input
      type="file"
      className={`file-input file-input-bordered file-input-${tone} file-input-${inputSize} w-full ${className}`.trim()}
      {...props}
    />
  )
}