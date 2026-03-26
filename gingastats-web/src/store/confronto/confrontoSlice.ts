import { createSlice } from '@reduxjs/toolkit';
import type { ConfrontoCompleto, AnaliseIa } from '../../types/types';
import { fetchConfrontoCompleto, fetchAnaliseIa } from './confrontoThunks';

interface ConfrontoState {
  dados: ConfrontoCompleto | null;
  analiseIa: AnaliseIa | null;
  statusDados: 'idle' | 'loading' | 'succeeded' | 'failed';
  statusAnalise: 'idle' | 'loading' | 'succeeded' | 'failed';
  errorDados: string | null;
  errorAnalise: string | null;
}

const initialState: ConfrontoState = {
  dados: null,
  analiseIa: null,
  statusDados: 'idle',
  statusAnalise: 'idle',
  errorDados: null,
  errorAnalise: null,
};

const confrontoSlice = createSlice({
  name: 'confronto',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // fetchConfrontoCompleto
    builder
      .addCase(fetchConfrontoCompleto.pending, (state) => {
        state.statusDados = 'loading';
        state.errorDados = null;
        state.dados = null;          // reset para evitar flash de confronto anterior
        state.analiseIa = null;      // reset da análise ao trocar de confronto
        state.statusAnalise = 'idle';
      })
      .addCase(fetchConfrontoCompleto.fulfilled, (state, action) => {
        state.statusDados = 'succeeded';
        state.dados = action.payload;
      })
      .addCase(fetchConfrontoCompleto.rejected, (state, action) => {
        state.statusDados = 'failed';
        state.errorDados = action.error.message ?? 'Erro desconhecido';
      });

    // fetchAnaliseIa
    builder
      .addCase(fetchAnaliseIa.pending, (state) => {
        state.statusAnalise = 'loading';
        state.errorAnalise = null;
      })
      .addCase(fetchAnaliseIa.fulfilled, (state, action) => {
        state.statusAnalise = 'succeeded';
        state.analiseIa = action.payload;
      })
      .addCase(fetchAnaliseIa.rejected, (state, action) => {
        state.statusAnalise = 'failed';
        state.errorAnalise = action.error.message ?? 'Erro desconhecido';
      });
  },
});

export default confrontoSlice.reducer;
