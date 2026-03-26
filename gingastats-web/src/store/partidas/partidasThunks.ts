import { createAsyncThunk } from '@reduxjs/toolkit';
import { getPartidas } from '../../api/api';
import type { Partida } from '../../types/types';

export const fetchPartidas = createAsyncThunk<Partida[]>(
  'partidas/fetchPartidas',
  async () => {
    const data = await getPartidas();
    return data as Partida[];
  }
);
