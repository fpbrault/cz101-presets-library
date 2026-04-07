import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import TextAreaInput from '@/components/forms/TextAreaInput'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('TextAreaInput', () => {
  it('renders with default md size class', () => {
    renderWithProviders(<TextAreaInput value="Warm brass" readOnly />)

    const textarea = screen.getByDisplayValue('Warm brass')
    expect(textarea.className).toContain('textarea-md')
  })

  it('applies size and custom classes', () => {
    renderWithProviders(
      <TextAreaInput
        value="Long tail"
        readOnly
        size="sm"
        className="min-h-20"
      />,
    )

    const textarea = screen.getByDisplayValue('Long tail')
    expect(textarea.className).toContain('textarea-sm')
    expect(textarea.className).toContain('min-h-20')
  })
})
