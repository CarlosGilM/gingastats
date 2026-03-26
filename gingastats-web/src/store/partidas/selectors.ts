import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Partida } from '../../types/types';

export const selectPartidasLista = (s: RootState) => s.partidas.lista;
export const selectPartidasStatus = (s: RootState) => s.partidas.status;

export const selectPartidasPorData = createSelector(
  selectPartidasLista,
  (lista) =>
    lista.reduce<Record<string, Partida[]>>((acc, p) => {
      const dia = new Date(p.data).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).toUpperCase();
      (acc[dia] ??= []).push(p);
      return acc;
    }, {})
);
