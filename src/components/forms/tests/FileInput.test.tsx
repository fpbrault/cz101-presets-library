import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import FileInput from '@/components/forms/FileInput'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('FileInput', () => {
  it('renders file input with defaults', () => {
    renderWithProviders(<FileInput aria-label="Import" />)

    const input = screen.getByLabelText('Import') as HTMLInputElement
    expect(input.type).toBe('file')
    expect(input.className).toContain('file-input-md')
  })

  it('applies tone and size variants', () => {
    renderWithProviders(
      <FileInput aria-label="Upload" tone="secondary" inputSize="sm" />,
    )

    const input = screen.getByLabelText('Upload')
    expect(input.className).toContain('file-input-secondary')
    expect(input.className).toContain('file-input-sm')
  })
})
