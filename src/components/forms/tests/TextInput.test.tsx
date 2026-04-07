import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import TextInput from '@/components/forms/TextInput'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('TextInput', () => {
  it('renders with default md size class', () => {
    renderWithProviders(<TextInput value="CZ" readOnly />)

    const input = screen.getByDisplayValue('CZ')
    expect(input.className).toContain('input-md')
  })

  it('applies size and custom classes', () => {
    renderWithProviders(
      <TextInput value="Pad" readOnly inputSize="sm" className="w-full mt-1" />,
    )

    const input = screen.getByDisplayValue('Pad')
    expect(input.className).toContain('input-sm')
    expect(input.className).toContain('w-full')
  })
})
