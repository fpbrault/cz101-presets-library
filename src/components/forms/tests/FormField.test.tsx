import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import FormField from '@/components/forms/FormField'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('FormField', () => {
  it('renders label and child content', () => {
    renderWithProviders(
      <FormField label="Preset Name" htmlFor="preset-name">
        <input
          id="preset-name"
          className="input input-bordered"
          value="CZ Pad"
          readOnly
        />
      </FormField>,
    )

    expect(screen.getByText('Preset Name')).toBeTruthy()
    expect((screen.getByDisplayValue('CZ Pad') as HTMLInputElement).id).toBe(
      'preset-name',
    )
  })

  it('supports custom label classes', () => {
    renderWithProviders(
      <FormField label="Tags" labelClassName="text-xs uppercase tracking-wider">
        <input className="input input-bordered" value="bass,pad" readOnly />
      </FormField>,
    )

    expect(screen.getByText('Tags').className).toContain('uppercase')
  })
})
