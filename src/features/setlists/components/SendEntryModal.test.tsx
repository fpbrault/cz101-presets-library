import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SendEntryModal from '@/features/setlists/components/SendEntryModal'
import { renderWithProviders } from '@/test/renderWithProviders'

const selectedSetlist = {
  id: 'set-1',
  name: 'Demo Setlist',
  createdAt: '2026-01-01T00:00:00.000Z',
  source: 'manual' as const,
  entries: [],
}

describe('SendEntryModal', () => {
  it('emits bank/slot changes and submits entry', async () => {
    const user = userEvent.setup()
    const onSendEntryToSlot = vi.fn()
    const setSendModalState = vi.fn()

    renderWithProviders(
      <SendEntryModal
        selectedSetlist={selectedSetlist}
        sendModalState={{ entryIndex: 2, bank: 'internal', slot: 3 }}
        setSendModalState={setSendModalState}
        onSendEntryToSlot={onSendEntryToSlot}
      />,
    )

    await user.selectOptions(screen.getByTestId('send-entry-bank'), 'cartridge')
    await user.selectOptions(screen.getByTestId('send-entry-slot'), '7')
    await user.click(screen.getByTestId('send-entry-confirm'))

    expect(setSendModalState).toHaveBeenCalledWith({
      entryIndex: 2,
      bank: 'cartridge',
      slot: 3,
    })
    expect(setSendModalState).toHaveBeenCalledWith({
      entryIndex: 2,
      bank: 'internal',
      slot: 7,
    })
    expect(onSendEntryToSlot).toHaveBeenCalledWith('set-1', 2, 'internal', 3)
    expect(setSendModalState).toHaveBeenCalled()
  })
})
