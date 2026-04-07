import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import ModalShell from '@/components/ui/ModalShell'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('ModalShell', () => {
  it('renders children', () => {
    renderWithProviders(
      <ModalShell>
        <div data-testid="modal-content">Modal Content</div>
      </ModalShell>,
    )
    expect(screen.getByTestId('modal-content')).toBeTruthy()
  })

  it('applies custom panelClassName', () => {
    const customClass = 'my-custom-panel'
    renderWithProviders(
      <ModalShell panelClassName={customClass}>
        <div>Content</div>
      </ModalShell>,
    )
    expect(screen.getByText('Content').parentElement).toHaveClass(customClass)
  })

  it('calls onClose when backdrop button is clicked', () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ModalShell onClose={onClose}>
        <div>Content</div>
      </ModalShell>,
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    closeButton.click()

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
