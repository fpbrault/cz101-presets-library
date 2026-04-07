import React from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
  labelClassName?: string
  contentClassName?: string
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  children,
  className = '',
  labelClassName = 'label-text',
  contentClassName = 'mt-1',
}) => {
  return (
    <label className={`form-control ${className}`} htmlFor={htmlFor}>
      <span className={labelClassName}>{label}</span>
      <div className={contentClassName}>{children}</div>
    </label>
  )
}

export default FormField