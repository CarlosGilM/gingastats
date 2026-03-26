# Spec — Implementação Redux no GingaStats Web

**Gerado em:** 2026-03-26
**Baseado em:** PRD v1.0 + análise da codebase atual

---

## Pré-requisito

```bash
npm install @reduxjs/toolkit react-redux
```

---

## Visão Geral das Mudanças

| Tipo      | Arquivo                                      | O que muda                                              |
|-----------|----------------------------------------------|---------------------------------------------------------|
| CRIAR     | `src/store/index.ts`                         | configureStore, RootState, AppDispatch                  |
| CRIAR     | `src/store/hooks.ts`                         | useAppDispatch, useAppSelector tipados                  |
| CRIAR     | `src/store/partidas/partidasThunks.ts`       | fetchPartidas                                           |
| CRIAR     | `src/store/partidas/partidasSlice.ts`        | PartidasState, extraReducers                            |
| CRIAR     | `src/store/partidas/selectors.ts`            | selectPartidasPorData (memoizado)                       |
| CRIAR     | `src/store/confronto/confrontoThunks.ts`     | fetchConfrontoCompleto, fetchAnaliseIa                  |
| CRIAR     | `src/store/confronto/confrontoSlice.ts`      | ConfrontoState, extraReducers para ambos os thunks      |
| CRIAR     | `src/components/MatchCard.tsx`               | Extraído de Home.tsx + React.memo                       |
| CRIAR     | `src/components/MercadoCard.tsx`             | Extraído de AnaliseIaSection.tsx + React.memo           |
| MODIFICAR | `src/main.tsx`                               | Adicionar `<Provider store={store}>`                    |
| MODIFICAR | `src/pages/Home.tsx`                         | Remover useState/useEffect de API → useAppDispatch/Selector + useCallback |
| MODIFICAR | `src/pages/Confronto.tsx`                    | Remover useState/useEffect de API → useAppDispatch/Selector, tipar `any` |
| MODIFICAR | `src/components/AnaliseIaSection.tsx`        | Remover useState → useAppDispatch/Selector, usar MercadoCard |

---

## Arquivos a CRIAR

---

### `src/store/index.ts`

Configura a store central com os dois slices.

```typescript
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
```

---

### `src/store/hooks.ts`

Hooks tipados — **nenhum componente deve importar `useDispatch`/`useSelector` diretamente.**

```typescript
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

---

### `src/store/partidas/partidasThunks.ts`

Thunk que chama `getPartidas()` da camada de API.

```typescript
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
```

> `getPartidas()` já retorna `r.data` direto (ver `api.ts:8`), então não precisa de `.data` adicional.

---

### `src/store/partidas/partidasSlice.ts`

Slice com estado `idle | loading | succeeded | failed`.

```typescript
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
```

---

### `src/store/partidas/selectors.ts`

Move o `reduce` que hoje está inline em `Home.tsx` para um seletor memoizado. A computação só re-executa quando `lista` mudar.

```typescript
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
```

> A função de formatação de data é idêntica à que está em `Home.tsx:140-144` — apenas movida para cá.

---

### `src/store/confronto/confrontoThunks.ts`

Dois thunks independentes: dados do confronto e análise IA.

```typescript
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
```

> `getAnaliseIa` retorna `{ analise_ia: AnaliseIa, ... }` (ver `AnaliseIaSection.tsx:26`), por isso o `.analise_ia` aqui.

---

### `src/store/confronto/confrontoSlice.ts`

Slice com status separado para dados e para análise IA (análise é lazy, não pode bloquear o render principal).
**Importante:** no `.pending` de `fetchConfrontoCompleto`, o slice reseta `dados` e `statusDados` para evitar flash de dados do confronto anterior ao navegar entre partidas.

```typescript
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
```

---

### `src/components/MatchCard.tsx`

Extraído de `Home.tsx` (linhas 63–125). Envolto em `React.memo`.
**Mudança na prop `onClick`:** recebe `(partida: Partida) => void` em vez de `() => void` — isso permite que `Home.tsx` use um único `useCallback` estável para todos os cards.

```tsx
import React from 'react';
import type { Partida } from '../types/types';
import EscudoTime from './EscudoTime';

interface MatchCardProps {
  partida: Partida;
  index: number;
  onClick: (partida: Partida) => void;
}

const MatchCard = React.memo(({ partida, index, onClick }: MatchCardProps) => {
  const hora = new Date(partida.data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      onClick={() => onClick(partida)}
      className="w-full group relative text-left"
      style={{ animation: `slideIn 0.4s ease forwards`, animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      <div
        className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(0,230,118,0.15), transparent 60%)' }}
      />

      <div className="relative flex items-center gap-3 px-5 py-4 rounded-xl border border-white/8 bg-white/3 group-hover:bg-white/6 group-hover:border-[#00e676]/25 transition-all duration-300">
        <div className="shrink-0 w-12 text-center">
          <span style={{ fontFamily: 'DM Mono', fontSize: 15, color: '#00e676', fontWeight: 500 }}>{hora}</span>
        </div>

        <div className="w-px h-8 bg-white/10 shrink-0" />

        <div className="flex items-center justify-end gap-2 overflow-hidden" style={{ flex: '1 1 0', minWidth: 0 }}>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 18,
            letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {partida.time_casa.nome}
          </span>
          <div className="shrink-0">
            <EscudoTime sofascoreId={partida.time_casa.sofascore_id} nome={partida.time_casa.nome} size={30} />
          </div>
        </div>

        <div className="shrink-0 w-10 text-center">
          <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 13, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>VS</span>
        </div>

        <div className="flex items-center gap-2 overflow-hidden" style={{ flex: '1 1 0', minWidth: 0 }}>
          <div className="shrink-0">
            <EscudoTime sofascoreId={partida.time_fora.sofascore_id} nome={partida.time_fora.nome} size={30} />
          </div>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 18,
            letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {partida.time_fora.nome}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partida.competicao}
          </span>
          <span className="text-white/20 group-hover:text-[#00e676] group-hover:translate-x-1 transition-all duration-200 text-sm">→</span>
        </div>
      </div>
    </button>
  );
});

MatchCard.displayName = 'MatchCard';
export default MatchCard;
```

---

### `src/components/MercadoCard.tsx`

Extraído do bloco `analise.mercados.map()` em `AnaliseIaSection.tsx` (linhas 106–124). Envolto em `React.memo`.

```tsx
import React from 'react';
import type { MercadoIa } from '../types/types';

const COR_CONFIANCA: Record<string, string> = {
  Alta: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Média: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Baixa: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface MercadoCardProps {
  mercado: MercadoIa;
}

const MercadoCard = React.memo(({ mercado: m }: MercadoCardProps) => (
  <div className="border border-white/10 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold">{m.mercado}</span>
        {m.linha !== null && (
          <span className="text-sm bg-white/10 px-2 py-0.5 rounded font-mono">{m.linha}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base font-black text-[#00e676]">{m.sugestao}</span>
        <span className={`text-sm px-2 py-0.5 rounded border font-semibold ${COR_CONFIANCA[m.confianca]}`}>
          {m.confianca}
        </span>
      </div>
    </div>
    <p className="text-sm text-white/50 leading-relaxed">{m.justificativa}</p>
  </div>
));

MercadoCard.displayName = 'MercadoCard';
export default MercadoCard;
```

> `COR_CONFIANCA` é removido de `AnaliseIaSection.tsx` e passa a viver aqui.

---

## Arquivos a MODIFICAR

---

### `src/main.tsx`

**O que muda:** envolver `<App>` com `<Provider store={store}>`.

```diff
  import { StrictMode } from 'react'
  import { createRoot } from 'react-dom/client'
+ import { Provider } from 'react-redux'
+ import { store } from './store'
  import './index.css'
  import App from './App.tsx'

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
+     <Provider store={store}>
        <App />
+     </Provider>
    </StrictMode>,
  )
```

---

### `src/pages/Home.tsx`

**O que muda:**
1. Remover `useState<Partida[]>` e `useState<boolean>` de loading
2. Remover `getPartidas` do import de api
3. Importar `useAppDispatch`, `useAppSelector` de store/hooks
4. Importar `fetchPartidas` de store/partidas/partidasThunks
5. Importar `selectPartidasPorData`, `selectPartidasStatus` de store/partidas/selectors
6. Remover o bloco `reduce` inline (agora está em `selectors.ts`)
7. Remover a definição inline de `MatchCard` (linhas 63–125)
8. Importar `MatchCard` de `../components/MatchCard`
9. Adicionar `useCallback` para `handleCardClick`

**Diff das mudanças no componente `Home`:**

```diff
- import { useEffect, useState } from 'react';
+ import { useCallback, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
- import { getPartidas } from '../api/api';
- import type { Partida } from '../types/types';
  import EscudoTime from '../components/EscudoTime';
+ import MatchCard from '../components/MatchCard';
  import logoFull from '../assets/logo-full.png';
+ import { useAppDispatch, useAppSelector } from '../store/hooks';
+ import { fetchPartidas } from '../store/partidas/partidasThunks';
+ import { selectPartidasPorData, selectPartidasStatus } from '../store/partidas/selectors';
```

```diff
- // MatchCard inline (linhas 63–125) — REMOVER COMPLETAMENTE
```

```diff
  export default function Home() {
-   const [partidas, setPartidas] = useState<Partida[]>([]);
-   const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
+   const dispatch = useAppDispatch();
+   const porData  = useAppSelector(selectPartidasPorData);
+   const status   = useAppSelector(selectPartidasStatus);
+   const loading  = status === 'loading' || status === 'idle';

    useEffect(() => {
      injectFonts();
-     getPartidas()
-       .then(setPartidas)
-       .finally(() => setLoading(false));
+     if (status === 'idle') dispatch(fetchPartidas());
-   }, []);
+   }, [dispatch, status]);

-   const porData = partidas.reduce<Record<string, Partida[]>>((acc, p) => {
-     const dia = new Date(p.data).toLocaleDateString('pt-BR', {
-       weekday: 'long', day: '2-digit', month: 'long',
-     }).toUpperCase();
-     acc[dia] = [...(acc[dia] ?? []), p];
-     return acc;
-   }, {});

+   const handleCardClick = useCallback((partida: Partida) => {
+     navigate(`/confronto/${partida.id}`);
+   }, [navigate]);
```

```diff
- <MatchCard key={p.id} partida={p} index={cardIndex + i} onClick={() => navigate(`/confronto/${p.id}`)} />
+ <MatchCard key={p.id} partida={p} index={cardIndex + i} onClick={handleCardClick} />
```

> **Atenção:** O import de `Partida` precisa ser readicionado caso não haja outro uso — neste caso `handleCardClick` usa o tipo na assinatura.
> Adicionar: `import type { Partida } from '../types/types';`

---

### `src/pages/Confronto.tsx`

**O que muda:**
1. Remover `useState` e `useEffect` baseados em API local
2. Remover `getConfrontoCompleto` do import de api
3. Importar `useAppDispatch`, `useAppSelector`
4. Importar `fetchConfrontoCompleto`
5. Tipar `dados` corretamente como `ConfrontoCompleto` (hoje está como `any` na linha 61)

**Diff:**

```diff
- import { useEffect, useState } from 'react';
+ import { useEffect } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
- import { getConfrontoCompleto } from '../api/api';
+ import type { ConfrontoCompleto } from '../types/types';
  import MediasTime from '../components/MediasTime';
  import AnaliseIaSection from '../components/AnaliseIaSection';
  import EscudoTime from '../components/EscudoTime';
  import logoFull from '../assets/logo-full.png';
+ import { useAppDispatch, useAppSelector } from '../store/hooks';
+ import { fetchConfrontoCompleto } from '../store/confronto/confrontoThunks';
```

```diff
  export default function Confronto() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
-   const [dados, setDados] = useState<any>(null);
-   const [loadingDados, setLoadingDados] = useState(true);
+   const dispatch     = useAppDispatch();
+   const dados        = useAppSelector((s) => s.confronto.dados);
+   const statusDados  = useAppSelector((s) => s.confronto.statusDados);
+   const loadingDados = statusDados === 'loading' || statusDados === 'idle';

    useEffect(() => {
      injectFonts();
      if (!id) return;
-     setLoadingDados(true);
-     getConfrontoCompleto(Number(id))
-       .then(setDados)
-       .finally(() => setLoadingDados(false));
+     dispatch(fetchConfrontoCompleto({ id: Number(id) }));
-   }, [id]);
+   }, [dispatch, id]);
```

> O reset de `dados` para `null` no `.pending` do slice (ver `confrontoSlice.ts`) garante que `loadingDados` seja `true` ao navegar para outro confronto.

---

### `src/components/AnaliseIaSection.tsx`

**O que muda:**
1. Remover `useState<AnaliseIa | null>`, `useState<boolean>` (loading) e `useState<boolean>` (solicitado)
2. Remover `getAnaliseIa` do import
3. Importar `useAppDispatch`, `useAppSelector`
4. Importar `fetchAnaliseIa`
5. Importar `MercadoCard` e remover o bloco inline de mercados
6. Remover `COR_CONFIANCA` (foi para `MercadoCard.tsx`)
7. Adicionar controle de `solicitado` via `statusAnalise !== 'idle'`

**Diff:**

```diff
- import { useState } from 'react';
- import type { AnaliseIa, MercadoIa } from '../types/types';
- import { getAnaliseIa } from '../api/api';
+ import { useAppDispatch, useAppSelector } from '../store/hooks';
+ import { fetchAnaliseIa } from '../store/confronto/confrontoThunks';
+ import MercadoCard from './MercadoCard';
```

```diff
- const COR_CONFIANCA: Record<string, string> = {
-   Alta: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
-   Média: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
-   Baixa: 'bg-red-500/20 text-red-400 border-red-500/30',
- };
```

```diff
  export default function AnaliseIaSection({ partidaId, jogos = 10 }: Props) {
-   const [analise, setAnalise] = useState<AnaliseIa | null>(null);
-   const [loading, setLoading] = useState(false);
-   const [solicitado, setSolicitado] = useState(false);
+   const dispatch      = useAppDispatch();
+   const analise       = useAppSelector((s) => s.confronto.analiseIa);
+   const statusAnalise = useAppSelector((s) => s.confronto.statusAnalise);
+   const loading       = statusAnalise === 'loading';
+   const solicitado    = statusAnalise !== 'idle';

-   const solicitar = async () => {
-     setSolicitado(true);
-     setLoading(true);
-     try {
-       const r = await getAnaliseIa(partidaId, jogos);
-       setAnalise(r.analise_ia);
-     } finally {
-       setLoading(false);
-     }
-   };
+   const solicitar = () => {
+     dispatch(fetchAnaliseIa({ id: partidaId, jogos }));
+   };
```

```diff
  {/* Mercados */}
  <div className="space-y-3">
-   {analise.mercados.map((m: MercadoIa) => (
-     <div key={m.mercado} className="border border-white/10 rounded-xl p-5">
-       <div className="flex items-center justify-between mb-3">
-         <div className="flex items-center gap-2">
-           <span className="text-base font-bold">{m.mercado}</span>
-           {m.linha !== null && (
-             <span className="text-sm bg-white/10 px-2 py-0.5 rounded font-mono">{m.linha}</span>
-           )}
-         </div>
-         <div className="flex items-center gap-2">
-           <span className="text-base font-black text-[#00e676]">{m.sugestao}</span>
-           <span className={`text-sm px-2 py-0.5 rounded border font-semibold ${COR_CONFIANCA[m.confianca]}`}>
-             {m.confianca}
-           </span>
-         </div>
-       </div>
-       <p className="text-sm text-white/50 leading-relaxed">{m.justificativa}</p>
-     </div>
-   ))}
+   {analise.mercados.map((m) => (
+     <MercadoCard key={m.mercado} mercado={m} />
+   ))}
  </div>
```

---

## Estrutura Final de Arquivos

```
src/
├── store/
│   ├── index.ts                      ← NOVO
│   ├── hooks.ts                      ← NOVO
│   ├── partidas/
│   │   ├── partidasThunks.ts         ← NOVO
│   │   ├── partidasSlice.ts          ← NOVO
│   │   └── selectors.ts              ← NOVO
│   └── confronto/
│       ├── confrontoThunks.ts        ← NOVO
│       └── confrontoSlice.ts         ← NOVO
├── components/
│   ├── MatchCard.tsx                 ← NOVO (extraído de Home.tsx)
│   ├── MercadoCard.tsx               ← NOVO (extraído de AnaliseIaSection.tsx)
│   ├── AnaliseIaSection.tsx          ← MODIFICADO
│   ├── EscudoTime.tsx                (sem mudança)
│   ├── InsightMercados.tsx           (sem mudança)
│   └── MediasTime.tsx                (sem mudança)
├── pages/
│   ├── Home.tsx                      ← MODIFICADO
│   └── Confronto.tsx                 ← MODIFICADO
├── api/
│   └── api.ts                        (sem mudança)
├── types/
│   └── types.ts                      (sem mudança)
├── main.tsx                          ← MODIFICADO
└── App.tsx                           (sem mudança)
```

---

## Pontos de Atenção / Armadilhas

### 1. `React.memo` só funciona com props estáveis
`MatchCard` recebe `onClick`. Se `Home.tsx` passar `() => navigate(...)` diretamente no JSX, uma nova referência é criada a cada render e o `memo` não tem efeito. O `useCallback` em `handleCardClick` resolve isso.

### 2. Re-fetch de confronto ao navegar
`Confronto.tsx` despacha `fetchConfrontoCompleto` sempre que `id` muda (sem condição `idle`). O reset de `dados = null` no `.pending` garante o spinner de loading correto, mas isso significa que navegar de volta ao mesmo confronto vai refazer a chamada de API. Esse é o comportamento esperado pelo PRD (análise sempre fresca).

### 3. `AnaliseIaSection` — prop `jogos`
O thunk `fetchAnaliseIa` recebe `{ id, jogos? }`. O componente passa `jogos` via prop (default `10`), então o dispatch passa corretamente: `dispatch(fetchAnaliseIa({ id: partidaId, jogos }))`.

### 4. `solicitado` sem useState
O estado `solicitado` (que controla se o botão "Gerar análise" já foi clicado) é derivado de `statusAnalise !== 'idle'`. Isso funciona porque o slice reseta `statusAnalise` para `'idle'` no `.pending` de `fetchConfrontoCompleto` — ou seja, ao navegar para outro confronto, o botão volta a aparecer automaticamente.

### 5. Tipagem de `dados` em `Confronto.tsx`
Hoje está como `any` (linha 61). Após a migração, `useAppSelector((s) => s.confronto.dados)` retorna `ConfrontoCompleto | null`, eliminando o `any`.

---

## Checklist de Implementação

### Fase 1 — Setup Redux
- [ ] `npm install @reduxjs/toolkit react-redux`
- [ ] Criar `src/store/index.ts`
- [ ] Criar `src/store/hooks.ts`
- [ ] Modificar `src/main.tsx` — adicionar `<Provider>`

### Fase 2 — Slice: Partidas
- [ ] Criar `src/store/partidas/partidasThunks.ts`
- [ ] Criar `src/store/partidas/partidasSlice.ts`
- [ ] Criar `src/store/partidas/selectors.ts`
- [ ] Modificar `src/pages/Home.tsx`

### Fase 3 — Slice: Confronto
- [ ] Criar `src/store/confronto/confrontoThunks.ts`
- [ ] Criar `src/store/confronto/confrontoSlice.ts`
- [ ] Modificar `src/pages/Confronto.tsx`
- [ ] Modificar `src/components/AnaliseIaSection.tsx`

### Fase 4 — React.memo
- [ ] Criar `src/components/MatchCard.tsx` (extrair de `Home.tsx`)
- [ ] Criar `src/components/MercadoCard.tsx` (extrair de `AnaliseIaSection.tsx`)
- [ ] Remover código inline removido dos arquivos de origem

### Fase 5 — Validação
- [ ] Testar fluxo: Home → clicar partida → Confronto → Gerar análise
- [ ] Voltar para Home e re-entrar no mesmo confronto: deve refazer a chamada (comportamento esperado)
- [ ] Navegar entre dois confrontos diferentes: spinner deve aparecer e dados do anterior não devem piscar
- [ ] Testar com backend offline: mensagem de erro deve aparecer (via `statusDados === 'failed'`)
- [ ] React DevTools Profiler: `MatchCard` e `MercadoCard` não devem re-renderizar sem mudança de props
