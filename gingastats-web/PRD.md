# PRD — Implementação de Redux no GingaStats Web

**Data**: 2026-03-26
**Versão**: 1.0
**Status**: Pronto para implementação

---

## 1. Contexto e Motivação

O GingaStats Web é atualmente uma SPA React com gerenciamento de estado **totalmente local** (useState por componente). Toda chamada de API vive dentro de `useEffect` sem padronização de estados de loading/erro. Não há Redux, Context API nem Zustand.

**Problemas identificados:**
- Chamadas de API duplicadas se o usuário navegar para a mesma rota duas vezes
- Estados de loading/erro inconsistentes entre páginas
- Re-renders desnecessários em listas de itens
- Seletores que buscariam objetos inteiros do estado quando só precisam de um campo

**Objetivo:** Implementar Redux Toolkit com padrões de produção — `createAsyncThunk`, `extraReducers`, `React.memo` e `useSelector` granular — alinhando a base de código aos conceitos cobrados em entrevista e melhorando performance real.

---

## 2. Stack Atual

| Dependência          | Versão    |
|----------------------|-----------|
| React                | 19.2.0    |
| React Router DOM     | 7.13.1    |
| Axios                | 1.13.6    |
| TypeScript           | 5.9.3     |
| Vite                 | 7.3.1     |
| Tailwind CSS         | 4.2.1     |

**Redux não está instalado.** Precisará ser adicionado.

---

## 3. Pacotes a Instalar

```bash
npm install @reduxjs/toolkit react-redux
```

Nenhuma outra dependência é necessária. O RTK já inclui `immer`, `redux-thunk` e `reselect`.

---

## 4. Escopo da Implementação

### 4.1 — createAsyncThunk + extraReducers

#### Mapeamento de API → Thunk → Slice

| Arquivo atual        | Função de API              | Thunk a criar             | Slice           |
|----------------------|----------------------------|---------------------------|-----------------|
| `Home.tsx`           | `getPartidas()`            | `fetchPartidas`           | `partidasSlice` |
| `Confronto.tsx`      | `getConfrontoCompleto(id)` | `fetchConfrontoCompleto`  | `confrontoSlice`|
| `AnaliseIaSection.tsx`| `getAnaliseIa(id)`        | `fetchAnaliseIa`          | `confrontoSlice`|

#### Estrutura de Estado por Slice

**`partidasSlice`**
```typescript
interface PartidasState {
  lista: Partida[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}
```

**`confrontoSlice`**
```typescript
interface ConfrontoState {
  dados: ConfrontoCompleto | null;
  analiseIa: AnaliseIa | null;
  statusDados: 'idle' | 'loading' | 'succeeded' | 'failed';
  statusAnalise: 'idle' | 'loading' | 'succeeded' | 'failed';
  errorDados: string | null;
  errorAnalise: string | null;
}
```

#### Padrão de extraReducers (aplicar nos dois slices)

```typescript
extraReducers: (builder) => {
  builder
    .addCase(fetchPartidas.pending,   (state) => { state.status = 'loading'; state.error = null; })
    .addCase(fetchPartidas.fulfilled, (state, action) => { state.status = 'succeeded'; state.lista = action.payload; })
    .addCase(fetchPartidas.rejected,  (state, action) => { state.status = 'failed'; state.error = action.error.message ?? 'Erro desconhecido'; });
}
```

#### Estrutura de Arquivos Redux

```
src/
└── store/
    ├── index.ts              ← configureStore + RootState + AppDispatch
    ├── hooks.ts              ← useAppDispatch / useAppSelector (tipados)
    ├── partidas/
    │   ├── partidasSlice.ts  ← createSlice + extraReducers
    │   └── partidasThunks.ts ← fetchPartidas (createAsyncThunk)
    └── confronto/
        ├── confrontoSlice.ts ← createSlice + extraReducers
        └── confrontoThunks.ts← fetchConfrontoCompleto + fetchAnaliseIa
```

#### Detalhes de `store/index.ts`

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

#### Detalhes de `store/hooks.ts`

```typescript
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

> **Regra:** Nenhum componente usa `useDispatch` ou `useSelector` diretamente. Sempre `useAppDispatch` e `useAppSelector`.

#### Integração em `main.tsx`

```tsx
import { Provider } from 'react-redux';
import { store } from './store';

<Provider store={store}>
  <App />
</Provider>
```

#### Migração de `Home.tsx`

**Antes:**
```tsx
const [partidas, setPartidas] = useState<Partida[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  getPartidas().then(setPartidas).finally(() => setLoading(false));
}, []);
```

**Depois:**
```tsx
const dispatch = useAppDispatch();
const lista    = useAppSelector((s) => s.partidas.lista);
const status   = useAppSelector((s) => s.partidas.status);

useEffect(() => {
  if (status === 'idle') dispatch(fetchPartidas());
}, [dispatch, status]);

const loading = status === 'loading';
```

> A condição `status === 'idle'` evita re-fetch se o componente for remontado e os dados já estiverem carregados.

#### Migração de `Confronto.tsx`

**Antes:**
```tsx
const [dados, setDados] = useState<ConfrontoCompleto | null>(null);
const [loadingDados, setLoadingDados] = useState(true);

useEffect(() => {
  getConfrontoCompleto(id).then(setDados).finally(() => setLoadingDados(false));
}, [id]);
```

**Depois:**
```tsx
const dispatch = useAppDispatch();
const dados       = useAppSelector((s) => s.confronto.dados);
const statusDados = useAppSelector((s) => s.confronto.statusDados);

useEffect(() => {
  dispatch(fetchConfrontoCompleto({ id: Number(id) }));
}, [dispatch, id]);

const loadingDados = statusDados === 'loading';
```

> `fetchConfrontoCompleto` é despachado sempre que o `id` da rota muda. O slice deve resetar `dados` e `statusDados` para `idle` no `pending` para evitar exibir dados de um confronto anterior.

#### Migração de `AnaliseIaSection.tsx`

**Antes:**
```tsx
const [analise, setAnalise] = useState<AnaliseIa | null>(null);
const [loading, setLoading] = useState(false);

const handleSolicitar = () => {
  setLoading(true);
  getAnaliseIa(partidaId).then((r) => setAnalise(r.analise_ia)).finally(() => setLoading(false));
};
```

**Depois:**
```tsx
const dispatch        = useAppDispatch();
const analise         = useAppSelector((s) => s.confronto.analiseIa);
const statusAnalise   = useAppSelector((s) => s.confronto.statusAnalise);

const handleSolicitar = () => {
  dispatch(fetchAnaliseIa({ id: partidaId }));
};

const loading = statusAnalise === 'loading';
```

---

### 4.2 — React.memo nos Itens de Lista

#### Componentes a Envolver

| Componente      | Localização                        | Lista que o renderiza                     |
|-----------------|------------------------------------|-------------------------------------------|
| `MatchCard`     | inline em `Home.tsx`               | `Object.entries(porData).map()`           |
| `MercadoCard`   | inline em `AnaliseIaSection.tsx`   | `analise.mercados.map()`                  |

#### Ação

Os dois componentes estão definidos **inline** nos arquivos de suas páginas. A primeira etapa é **extraí-los para arquivos próprios** e depois envolve-los com `React.memo`.

**Estrutura após extração:**
```
src/
└── components/
    ├── MatchCard.tsx         ← extraído de Home.tsx
    ├── MercadoCard.tsx       ← extraído de AnaliseIaSection.tsx
    ├── AnaliseIaSection.tsx
    ├── EscudoTime.tsx
    ├── InsightMercados.tsx
    └── MediasTime.tsx
```

**Padrão de aplicação (`MatchCard` como exemplo):**
```tsx
import React from 'react';
import type { Partida } from '../types/types';

interface MatchCardProps {
  partida: Partida;
  onClick: (partida: Partida) => void;
}

const MatchCard = React.memo(({ partida, onClick }: MatchCardProps) => {
  // JSX atual do card
});

MatchCard.displayName = 'MatchCard';
export default MatchCard;
```

> **Atenção com `onClick`:** O handler deve ser estabilizado com `useCallback` em `Home.tsx` para que o `React.memo` seja eficaz — caso contrário uma nova referência de função a cada render desfaz o benefício.

```tsx
// Home.tsx
const handleCardClick = useCallback((partida: Partida) => {
  navigate(`/confronto/${partida.id}`);
}, [navigate]);
```

**Mesmo padrão para `MercadoCard`** — extrair de `AnaliseIaSection.tsx`, envolver com `React.memo`, garantir que props sejam estáveis.

---

### 4.3 — useSelector Granular

#### Princípio

Nunca selecionar um sub-objeto inteiro quando só um campo é necessário. Cada `useSelector` deve retornar o valor mais primitivo possível para minimizar re-renders.

#### Mapeamento de Seletores (estado alvo)

**Home.tsx:**
```typescript
// Ruim — re-render sempre que qualquer campo de partidas mudar
const partidas = useAppSelector((s) => s.partidas);

// Bom — re-render só quando lista ou status mudar, independentemente
const lista  = useAppSelector((s) => s.partidas.lista);
const status = useAppSelector((s) => s.partidas.status);
```

**Confronto.tsx:**
```typescript
// Granular
const dados       = useAppSelector((s) => s.confronto.dados);
const statusDados = useAppSelector((s) => s.confronto.statusDados);
const errorDados  = useAppSelector((s) => s.confronto.errorDados);
```

**AnaliseIaSection.tsx:**
```typescript
// Granular
const analiseIa     = useAppSelector((s) => s.confronto.analiseIa);
const statusAnalise = useAppSelector((s) => s.confronto.statusAnalise);
```

#### Seletores Memoizados com `createSelector` (opcional, fase 2)

Para seletores que envolvem computação (ex: agrupamento por data), usar `createSelector` do RTK:

```typescript
// store/partidas/selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectPartidasPorData = createSelector(
  (s: RootState) => s.partidas.lista,
  (lista) =>
    lista.reduce<Record<string, Partida[]>>((acc, p) => {
      const dia = p.data.split('T')[0];
      (acc[dia] ??= []).push(p);
      return acc;
    }, {})
);
```

> Isso move o `reduce` que hoje está inline em `Home.tsx` para um seletor memoizado — a computação só re-executa quando `lista` mudar.

---

## 5. Fluxo de Dados Após Implementação

```
Usuário navega para /
  └─→ Home.tsx monta
        └─→ useEffect: dispatch(fetchPartidas())  [se status === 'idle']
              └─→ thunk: getPartidas() via axios
                    ├─→ .pending:   status = 'loading'
                    ├─→ .fulfilled: lista = payload, status = 'succeeded'
                    └─→ .rejected:  error = msg,    status = 'failed'

Usuário clica em uma partida
  └─→ navigate('/confronto/123')
        └─→ Confronto.tsx monta, id = '123'
              └─→ useEffect: dispatch(fetchConfrontoCompleto({ id: 123 }))
                    └─→ [mesmos três estados]

Usuário clica em "Gerar análise"
  └─→ dispatch(fetchAnaliseIa({ id: 123 }))
        └─→ [mesmos três estados, analiseIa no slice]
```

---

## 6. Checklist de Implementação

### Fase 1 — Setup Redux

- [ ] Instalar `@reduxjs/toolkit` e `react-redux`
- [ ] Criar `src/store/index.ts` com `configureStore`
- [ ] Criar `src/store/hooks.ts` com `useAppDispatch` e `useAppSelector`
- [ ] Envolver `<App>` com `<Provider store={store}>` em `main.tsx`

### Fase 2 — Slice: Partidas

- [ ] Criar `src/store/partidas/partidasThunks.ts` com `fetchPartidas`
- [ ] Criar `src/store/partidas/partidasSlice.ts` com `extraReducers`
- [ ] Migrar `Home.tsx`: remover `useState` + `useEffect` de API, adicionar `useAppDispatch` + `useAppSelector`

### Fase 3 — Slice: Confronto

- [ ] Criar `src/store/confronto/confrontoThunks.ts` com `fetchConfrontoCompleto` e `fetchAnaliseIa`
- [ ] Criar `src/store/confronto/confrontoSlice.ts` com `extraReducers` para ambos os thunks
- [ ] Migrar `Confronto.tsx`: remover `useState` + `useEffect` de API
- [ ] Migrar `AnaliseIaSection.tsx`: remover `useState`, substituir handler por `dispatch`

### Fase 4 — React.memo

- [ ] Extrair `MatchCard` de `Home.tsx` para `src/components/MatchCard.tsx`
- [ ] Envolver `MatchCard` com `React.memo`
- [ ] Adicionar `useCallback` no handler de click em `Home.tsx`
- [ ] Extrair `MercadoCard` de `AnaliseIaSection.tsx` para `src/components/MercadoCard.tsx`
- [ ] Envolver `MercadoCard` com `React.memo`

### Fase 5 — useSelector Granular

- [ ] Auditar todos os `useAppSelector` — nenhum deve retornar um sub-objeto inteiro
- [ ] (Opcional) Criar `src/store/partidas/selectors.ts` com `selectPartidasPorData` usando `createSelector`

### Fase 6 — Validação

- [ ] Testar fluxo completo: Home → Confronto → Análise IA
- [ ] Verificar que re-navegar para `/confronto/123` não gera chamada duplicada de API (dados já em `'succeeded'`)
- [ ] Abrir React DevTools Profiler e validar que `MatchCard` e `MercadoCard` não re-renderizam sem mudança de props
- [ ] Confirmar que estados de error são capturados (testar com backend offline)

---

## 7. Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| RTK vs Redux puro | Redux Toolkit | RTK é o padrão oficial desde 2020; elimina boilerplate e usa Immer internamente |
| Slices separados | `partidasSlice` + `confrontoSlice` | Domínios distintos; confronto tem 2 thunks independentes |
| Status por operação | `statusDados` e `statusAnalise` separados | Análise IA é lazy — não pode bloquear o render dos dados principais |
| Reset no pending | Sim para `confronto.dados` | Evita flash de dados do confronto anterior ao navegar |
| Thunks no mesmo slice ou separados | Arquivo `*Thunks.ts` separado | Facilita leitura e testes futuros; slice fica focado no estado |
| `createSelector` | Fase 2, opcional | O volume de dados é pequeno; memoização é ganho incremental, não bloqueador |

---

## 8. O Que NÃO Está no Escopo

- **Redux Persist** — não há requisito de persistência entre sessões
- **RTK Query** — seria ideal a longo prazo, mas introduz paradigma diferente; fora do escopo desta sprint
- **Testes unitários dos thunks** — desejável, mas não requisito para esta implementação
- **Middleware customizado** — sem necessidade identificada
- **DevTools Enhancer** — já habilitado por padrão em desenvolvimento pelo RTK

---

## 9. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| `React.memo` sem `useCallback` não tem efeito | Baixo | Checklist explícita no item 4.3 |
| Re-fetch ao re-navegar para o mesmo confronto | Médio | Verificar `statusDados !== 'loading'` antes de despachar, ou sempre despachar (RTK cancela automaticamente com AbortController) |
| Dados obsoletos de um confronto aparecendo em outro | Alto | Reset do estado no `.pending` do thunk `fetchConfrontoCompleto` |
| TypeScript inferindo `any` nos thunks | Baixo | Tipar explicitamente o `createAsyncThunk<ReturnType, ArgType, ThunkApiConfig>` |

---

*Documento gerado com base na análise da codebase em 2026-03-26.*