import { createAsyncThunk } from '@reduxjs/toolkit';
import { getConfrontoCompleto, getAnaliseIa } from '../../api/api';
import type { ConfrontoCompleto, AnaliseIa } from '../../types/types';

export const fetchConfrontoCompleto = createAsyncThunk<
  ConfrontoCompleto,
  { id: number; jogos?: number }
>(
  'confronto/fetchConfrontoCompleto',
  async ({ id, jogos }) => {
    const data = await getConfrontoCompleto(id, jogos);
    return data as ConfrontoCompleto;
  }
);

export const fetchAnaliseIa = createAsyncThunk<
  AnaliseIa,
  { id: number; jogos?: number }
>(
  'confronto/fetchAnaliseIa',
  async ({ id, jogos }) => {
    const data = await getAnaliseIa(id, jogos);
    return (data.analise_ia) as AnaliseIa;
  }
);
