import type { TextareaHTMLAttributes } from 'react'

interface TextAreaInputProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: 'sm' | 'md' | 'lg'
}

export default function TextAreaInput({
  size = 'md',
  className = '',
  ...props
}: TextAreaInputProps) {
  return (
    <textarea
      className={`textarea textarea-bordered textarea-${size} w-full ${className}`.trim()}
      {...props}
    />
  )
}