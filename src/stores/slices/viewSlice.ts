/**
 * View Slice - ViewState management
 */

import { trackReaderOpen } from '@/lib/analytics'
import type { StoreGet, StoreSet, ViewState } from '../utils'

export interface ViewSlice {
  viewState: ViewState
  setViewState: (state: ViewState) => void
}

export const createViewSlice = (_set: StoreSet, _get: StoreGet): ViewSlice => ({
  viewState: 'menu',
  setViewState: (state) => {
    if (state === 'reader') trackReaderOpen() // GA4: track reader usage via GTM dataLayer push
    _set({ viewState: state })
  },
})
