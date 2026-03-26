import { createSlice } from '@reduxjs/toolkit';
import type { Partida } from '../../types/types';
import { fetchPartidas } from './partidasThunks';

interface PartidasState {
  lista: Partida[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: PartidasState = {
  lista: [],
  status: 'idle',
  error: null,
};

const partidasSlice = createSlice({
  name: 'partidas',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPartidas.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPartidas.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.lista = action.payload;
      })
      .addCase(fetchPartidas.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Erro desconhecido';
      });
  },
});

export default partidasSlice.reducer;
