import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { TestAppProviders } from '@/test/TestAppProviders'

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: TestAppProviders,
    ...options,
  })
}
