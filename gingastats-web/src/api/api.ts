import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

export const getPartidas = () =>
  api.get('/partidas/agendadas').then(r => r.data);

export const getConfrontoCompleto = (partidaId: number, jogos = 10) =>
  api.get(`/analise/confronto/${partidaId}`, { params: { jogos } }).then(r => r.data);

export const getAnaliseIa = (partidaId: number, jogos = 10) =>
  api.get(`/analise/confronto/${partidaId}/ia`, { params: { jogos } }).then(r => r.data);

export default api;
