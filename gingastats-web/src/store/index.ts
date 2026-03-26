import { configureStore } from '@reduxjs/toolkit';
import partidasReducer from './partidas/partidasSlice';
import confrontoReducer from './confronto/confrontoSlice';

export const store = configureStore({
  reducer: {
    partidas: partidasReducer,
    confronto: confrontoReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
