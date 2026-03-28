/**
 * View Slice - ViewState management
 */

import type { StoreGet, StoreSet, ViewState } from '../utils'

export interface ViewSlice {
  viewState: ViewState
  setViewState: (state: ViewState) => void
}

export const createViewSlice = (_set: StoreSet, _get: StoreGet): ViewSlice => ({
  viewState: 'menu',
  setViewState: (state) => _set({ viewState: state }),
})
