from playwright.sync_api import sync_playwright
from datetime import datetime
import time
from supabase import create_client
from dotenv import load_dotenv
import os

# ─────────────────────────────────────────────────────────
# CONFIGURAÇÃO
# ─────────────────────────────────────────────────────────
load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

BASE_API = 'https://api.sofascore.com/api/v1'

TIMES = {
    'Flamengo':            5981,
    'Palmeiras':           1963,
    'Corinthians':         1957,
    'São Paulo':           1981,
    'Bahia':               1955,
    'Fluminense':          1961,
    'Athletico':           1967,
    'Red Bull Bragantino': 1999,
    'Grêmio':              5926,
    'Chapecoense':         21845,
    'Mirassol':            21982,
    'Coritiba':            1982,
    'Santos':              1968,
    'Botafogo':            1958,
    'Vitória':             1962,
    'Remo':                2012,
    'Atlético Mineiro':    1977,
    'Internacional':       1966,
    'Cruzeiro':            1954,
    'Vasco da Gama':       1974,
}

# Status que indicam jogo NÃO realizado — ignorar
STATUS_IGNORAR = {
    0,    # Não iniciado (futuro)
    60,   # Adiado
    70,   # Cancelado
    80,   # Abandonado
    90,   # W.O.
    93,   # Interrompido
}


def jogo_valido(evento):
    code = evento.get('status', {}).get('code', -1)
    if code in STATUS_IGNORAR:
        return False
    if evento.get('homeScore', {}).get('current') is None:
        return False
    return True


def resolver_placar(evento):
    hs = evento.get('homeScore', {})
    as_ = evento.get('awayScore', {})
    code = evento.get('status', {}).get('code', -1)

    pen_casa = hs.get('penalties')
    pen_fora = as_.get('penalties')

    if code == 120 or pen_casa is not None:
        terminou_em = 'PEN'
        gols_casa = hs.get('normaltime', hs.get('current'))
        gols_fora = as_.get('normaltime', as_.get('current'))
    elif code == 110:
        terminou_em = 'AET'
        gols_casa = hs.get('current')
        gols_fora = as_.get('current')
        pen_casa = None
        pen_fora = None
    else:
        terminou_em = 'FT'
        gols_casa = hs.get('current')
        gols_fora = as_.get('current')
        pen_casa = None
        pen_fora = None

    return gols_casa, gols_fora, terminou_em, pen_casa, pen_fora


def normalizar_valor(v, stat_name):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.replace('%', '').strip()
        if not v:
            return None
        try:
            v = float(v)
        except ValueError:
            return None
    if 'possession' in stat_name.lower() and isinstance(v, float) and v <= 1.0:
        v = round(v * 100)
    if 'expected' in stat_name.lower():
        return round(float(v), 2)
    return int(round(float(v)))


def extrair_stat(stats_json, stat_name):
    if not stats_json:
        return None, None
    for periodo in stats_json.get('statistics', []):
        if periodo.get('period') != 'ALL':
            continue
        for grupo in periodo.get('groups', []):
            for item in grupo.get('statisticsItems', []):
                if stat_name.lower() in item.get('name', '').lower():
                    h = normalizar_valor(item.get('home'), stat_name)
                    a = normalizar_valor(item.get('away'), stat_name)
                    return h, a
    return None, None


def upsert_time(supabase, nome, sofascore_id):
    slug = nome.lower().replace(' ', '-').replace('ã',
                                                  'a').replace('á', 'a').replace('ê', 'e')
    res = supabase.table('times').upsert(
        {'sofascore_id': sofascore_id, 'nome': nome, 'slug': slug},
        on_conflict='sofascore_id'
    ).execute()
    return res.data[0]['id']


def upsert_partida(supabase, evento, time_casa_id, time_fora_id):
    gc, gf, terminou, pen_c, pen_f = resolver_placar(evento)
    data_iso = datetime.fromtimestamp(
        evento.get('startTimestamp', 0)).isoformat()

    res = supabase.table('partidas').upsert({
        'sofascore_id':  evento['id'],
        'competicao':    evento.get('tournament', {}).get('name'),
        'time_casa_id':  time_casa_id,
        'time_fora_id':  time_fora_id,
        'data':          data_iso,
        'gols_casa':     gc,
        'gols_fora':     gf,
        'terminou_em':   terminou,
        'pen_casa':      pen_c,
        'pen_fora':      pen_f,
    }, on_conflict='sofascore_id').execute()

    return res.data[0]['id']


def upsert_estatisticas(supabase, partida_id, time_id, local, stats_json):
    def pick(par):
        return par[0] if local == 'casa' else par[1]

    supabase.table('estatisticas').upsert({
        'partida_id':           partida_id,
        'time_id':              time_id,
        'local':                local,
        'gols':                 pick(extrair_stat(stats_json, 'Goals')),
        'gols_esperados':       pick(extrair_stat(stats_json, 'Expected goals')),
        'grandes_chances':      pick(extrair_stat(stats_json, 'Big chances')),
        'finalizacoes':         pick(extrair_stat(stats_json, 'Total shots')),
        'finalizacoes_no_gol':  pick(extrair_stat(stats_json, 'Shots on target')),
        'posse':                pick(extrair_stat(stats_json, 'Ball possession')),
        'escanteios':           pick(extrair_stat(stats_json, 'Corner')),
        'faltas_cometidas':     pick(extrair_stat(stats_json, 'Fouls')),
        'desarmes':             pick(extrair_stat(stats_json, 'Tackles')),
        'impedimentos':         pick(extrair_stat(stats_json, 'Offsides')),
        'cartoes_amarelos':     pick(extrair_stat(stats_json, 'Yellow cards')),
        'cartoes_vermelhos':    pick(extrair_stat(stats_json, 'Red cards')),
    }, on_conflict='partida_id,time_id').execute()


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('❌ SUPABASE_URL e SUPABASE_KEY não encontrados. Verifique o arquivo .env')
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print('✅ Supabase conectado.')

    print('=' * 65)
    print('  COLETA — ÚLTIMOS 10 JOGOS | 20 TIMES DO BRASILEIRÃO')
    print('=' * 65)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale='pt-BR',
        )
        page = context.new_page()

        print('\n🌐 Iniciando sessão no Sofascore...')
        page.goto('https://www.sofascore.com/pt/',
                  wait_until='domcontentloaded', timeout=60000)
        time.sleep(2)
        print('✅ Sessão iniciada.\n')

        print('📋 Cadastrando times no banco...')
        ids_times = {}
        for nome, sof_id in TIMES.items():
            ids_times[sof_id] = upsert_time(supabase, nome, sof_id)
        print(f'   {len(ids_times)} times cadastrados.\n')

        total_salvo = 0
        total_ignorado = 0

        for nome, team_id in TIMES.items():
            print(f'{"─" * 65}')
            print(f'  ⚽ {nome.upper()}')

            response = page.evaluate(f'''async () => {{
                const resp = await fetch('{BASE_API}/team/{team_id}/events/last/0');
                if (!resp.ok) return {{ error: resp.status }};
                return await resp.json();
            }}''')

            if 'error' in response:
                print(f'  ❌ Erro HTTP {response["error"]}')
                continue

            todos_eventos = response.get('events', [])
            eventos_validos = [e for e in todos_eventos if jogo_valido(e)]
            eventos = list(reversed(eventos_validos[-10:]))

            print(
                f'  Total retornado: {len(todos_eventos)} | Válidos: {len(eventos_validos)} | Salvando: {len(eventos)}')

            ignorados_motivo = len(todos_eventos) - len(eventos_validos)
            if ignorados_motivo > 0:
                print(
                    f'  ⏭️  {ignorados_motivo} jogo(s) ignorado(s) (adiados/cancelados/sem placar)')

            for evento in eventos:
                event_id = evento['id']
                sof_casa = evento['homeTeam']['id']
                sof_fora = evento['awayTeam']['id']
                nome_casa = evento['homeTeam']['name']
                nome_fora = evento['awayTeam']['name']
                competicao = evento.get('tournament', {}).get('name', '?')
                gc, gf, terminou, _, _ = resolver_placar(evento)

                if sof_casa not in ids_times:
                    ids_times[sof_casa] = upsert_time(
                        supabase, nome_casa, sof_casa)
                if sof_fora not in ids_times:
                    ids_times[sof_fora] = upsert_time(
                        supabase, nome_fora, sof_fora)

                partida_id = upsert_partida(
                    supabase, evento, ids_times[sof_casa], ids_times[sof_fora])

                stats = page.evaluate(f'''async () => {{
                    const resp = await fetch('{BASE_API}/event/{event_id}/statistics');
                    if (!resp.ok) return null;
                    return await resp.json();
                }}''')

                tem_stats = stats and stats.get('statistics')
                upsert_estatisticas(
                    supabase, partida_id, ids_times[sof_casa], 'casa', stats if tem_stats else None)
                upsert_estatisticas(
                    supabase, partida_id, ids_times[sof_fora], 'fora', stats if tem_stats else None)

                stats_label = '✅' if tem_stats else '⚠️  sem stats'
                print(
                    f'  [{terminou}] {nome_casa} {gc}x{gf} {nome_fora} — {competicao} {stats_label}')

                total_salvo += 1
                time.sleep(0.8)

            time.sleep(1.5)

        browser.close()

    print(f'\n{"=" * 65}')
    print(f'  ✅ Coleta finalizada.')
    print(f'  Partidas salvas: {total_salvo}')
    print(f'{"=" * 65}')


if __name__ == '__main__':
    main()
