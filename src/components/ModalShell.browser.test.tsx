import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModalShell from '@/components/ModalShell'

describe('ModalShell', () => {
  it('renders children inside the modal', () => {
    render(<ModalShell><p>Modal Content</p></ModalShell>)
    expect(screen.getByText('Modal Content')).toBeTruthy()
  })

  it('renders as an open dialog element', () => {
    const { container } = render(<ModalShell><span>hi</span></ModalShell>)
    const dialog = container.querySelector('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog!.open).toBe(true)
  })

  it('applies modal-open class to dialog', () => {
    const { container } = render(<ModalShell><span>hi</span></ModalShell>)
    const dialog = container.querySelector('dialog')
    expect(dialog!.className).toContain('modal-open')
  })

  it('applies custom panelClassName to modal-box', () => {
    const { container } = render(
      <ModalShell panelClassName="w-full max-w-4xl"><span>hi</span></ModalShell>,
    )
    const box = container.querySelector('.modal-box')
    expect(box!.className).toContain('max-w-4xl')
  })

  it('does not render backdrop when onClose is not provided', () => {
    const { container } = render(<ModalShell><span>hi</span></ModalShell>)
    expect(container.querySelector('.modal-backdrop')).toBeNull()
  })

  it('renders a backdrop button when onClose is provided', () => {
    render(<ModalShell onClose={vi.fn()}><span>hi</span></ModalShell>)
    expect(screen.getByRole('button', { name: /close/i })).toBeTruthy()
  })

  it('calls onClose when backdrop button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalShell onClose={onClose}><span>hi</span></ModalShell>)
    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
