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

STATUS_FINALIZADO = {100, 110, 120}
STATUS_AO_VIVO = {6, 7, 31}
STATUS_AGENDADO = {0}
STATUS_IGNORAR = {60, 70, 80, 90, 93}


def classificar_status(code):
    if code in STATUS_FINALIZADO:
        return 'finalizado'
    if code in STATUS_AO_VIVO:
        return 'ao_vivo'
    if code in STATUS_AGENDADO:
        return 'agendado'
    return None


def resolver_placar(evento):
    hs = evento.get('homeScore', {})
    as_ = evento.get('awayScore', {})
    code = evento.get('status', {}).get('code', -1)

    pen_casa = hs.get('penalties')
    pen_fora = as_.get('penalties')

    if code == 120 or pen_casa is not None:
        return hs.get('normaltime', hs.get('current')), as_.get('normaltime', as_.get('current')), 'PEN', pen_casa, pen_fora
    elif code == 110:
        return hs.get('current'), as_.get('current'), 'AET', None, None
    elif code in STATUS_FINALIZADO:
        return hs.get('current'), as_.get('current'), 'FT', None, None
    else:
        return None, None, None, None, None


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
                    return normalizar_valor(item.get('home'), stat_name), normalizar_valor(item.get('away'), stat_name)
    return None, None


def upsert_time(supabase, nome, sofascore_id):
    slug = (nome.lower()
            .replace(' ', '-')
            .replace('ã', 'a').replace('á', 'a').replace('â', 'a')
            .replace('ê', 'e').replace('é', 'e')
            .replace('í', 'i')
            .replace('õ', 'o').replace('ó', 'o').replace('ô', 'o')
            .replace('ú', 'u').replace('ü', 'u')
            .replace('ç', 'c'))
    res = supabase.table('times').upsert(
        {'sofascore_id': sofascore_id, 'nome': nome, 'slug': slug},
        on_conflict='sofascore_id'
    ).execute()
    return res.data[0]['id']


def upsert_partida(supabase, evento, time_casa_id, time_fora_id, status_str):
    gc, gf, terminou, pen_c, pen_f = resolver_placar(evento)
    data_iso = datetime.fromtimestamp(
        evento.get('startTimestamp', 0)).isoformat()

    res = supabase.table('partidas').upsert({
        'sofascore_id':  evento['id'],
        'competicao':    evento.get('tournament', {}).get('name'),
        'time_casa_id':  time_casa_id,
        'time_fora_id':  time_fora_id,
        'data':          data_iso,
        'status':        status_str,
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


def processar_eventos(supabase, page, eventos, ids_times, label):
    salvos = 0
    ignorados = 0

    for evento in eventos:
        code = evento.get('status', {}).get('code', -1)
        status_str = classificar_status(code)

        if status_str is None:
            ignorados += 1
            continue

        sof_casa = evento['homeTeam']['id']
        sof_fora = evento['awayTeam']['id']
        nome_casa = evento['homeTeam']['name']
        nome_fora = evento['awayTeam']['name']
        event_id = evento['id']

        if sof_casa not in ids_times:
            ids_times[sof_casa] = upsert_time(supabase, nome_casa, sof_casa)
        if sof_fora not in ids_times:
            ids_times[sof_fora] = upsert_time(supabase, nome_fora, sof_fora)

        partida_id = upsert_partida(
            supabase, evento, ids_times[sof_casa], ids_times[sof_fora], status_str)

        if status_str == 'finalizado':
            try:
                stats = page.evaluate(f'''async () => {{
                    const resp = await fetch('{BASE_API}/event/{event_id}/statistics');
                    if (!resp.ok) return null;
                    return await resp.json();
                }}''')
                tem_stats = stats and stats.get('statistics')
            except Exception as e_stats:
                print(f'    ⚠️  Erro ao buscar stats do evento {event_id}: {e_stats}')
                tem_stats = False

            if tem_stats:
                upsert_estatisticas(
                    supabase, partida_id, ids_times[sof_casa], 'casa', stats)
                upsert_estatisticas(
                    supabase, partida_id, ids_times[sof_fora], 'fora', stats)
                stats_label = '✅'
            else:
                stats_label = '⚠️  sem stats'

            gc, gf, terminou, _, _ = resolver_placar(evento)
            print(
                f'    [{terminou}] {nome_casa} {gc}x{gf} {nome_fora} {stats_label}')
            time.sleep(0.8)
        else:
            data = datetime.fromtimestamp(evento.get(
                'startTimestamp', 0)).strftime('%d/%m/%Y %H:%M')
            print(f'    [📅 agendado] {nome_casa} x {nome_fora} — {data}')

        salvos += 1

    return salvos, ignorados


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('❌ SUPABASE_URL e SUPABASE_KEY não encontrados. Verifique o arquivo .env')
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print('✅ Supabase conectado.')
    print('=' * 65)
    print(f'  COLETA SEMANAL — {datetime.now().strftime("%d/%m/%Y %H:%M")}')
    print('  Último jogo + Próximo jogo | 20 times')
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

        ids_times = {}
        for nome, sof_id in TIMES.items():
            ids_times[sof_id] = upsert_time(supabase, nome, sof_id)
        print(f'📋 {len(ids_times)} times cadastrados.\n')

        total_salvos = 0
        total_ignorados = 0

        for nome, team_id in TIMES.items():
            print(f'{"─" * 65}')
            print(f'  ⚽ {nome.upper()}')

            try:
                print('  📁 Último jogo:')
                resp_last = page.evaluate(f'''async () => {{
                    const resp = await fetch('{BASE_API}/team/{team_id}/events/last/0');
                    if (!resp.ok) return {{ error: resp.status }};
                    return await resp.json();
                }}''')

                if 'error' not in resp_last:
                    eventos_last = resp_last.get('events', [])
                    ultimos = [e for e in eventos_last if classificar_status(
                        e.get('status', {}).get('code', -1)) == 'finalizado']
                    s, i = processar_eventos(
                        supabase, page, ultimos[-1:], ids_times, 'ultimo')
                    total_salvos += s
                    total_ignorados += i
                else:
                    print(f'    ❌ Erro HTTP {resp_last["error"]}')

                time.sleep(1)

                print('  📅 Próximo jogo:')
                resp_next = page.evaluate(f'''async () => {{
                    const resp = await fetch('{BASE_API}/team/{team_id}/events/next/0');
                    if (!resp.ok) return {{ error: resp.status }};
                    return await resp.json();
                }}''')

                if 'error' not in resp_next:
                    eventos_next = resp_next.get('events', [])
                    proximos = [e for e in eventos_next if classificar_status(
                        e.get('status', {}).get('code', -1)) == 'agendado']
                    s, i = processar_eventos(
                        supabase, page, proximos[:1], ids_times, 'proximo')
                    total_salvos += s
                    total_ignorados += i
                else:
                    print(f'    ❌ Erro HTTP {resp_next["error"]}')

            except Exception as e:
                print(f'  ❌ Erro inesperado ao processar {nome}: {e}')

            time.sleep(1.5)

        print(f'\n{"─" * 65}')
        print("  🔄 Verificando jogos agendados que já foram finalizados...")
        ids_agendados = supabase.table("partidas").select(
            "sofascore_id").eq("status", "agendado").execute().data

        if not ids_agendados:
            print("  Nenhum jogo agendado no banco.")
        else:
            print(f"  {len(ids_agendados)} jogo(s) agendado(s) encontrado(s).\n")
            for row in ids_agendados:
                sof_id = row["sofascore_id"]
                resp_check = page.evaluate(f'''async () => {{
                    const resp = await fetch("{BASE_API}/event/{sof_id}");
                    if (!resp.ok) return null;
                    return await resp.json();
                }}''')
                if resp_check and resp_check.get("event"):
                    ev = resp_check["event"]
                    code = ev.get("status", {}).get("code", -1)
                    novo_status = classificar_status(code)
                    nome_casa = ev["homeTeam"]["name"]
                    nome_fora = ev["awayTeam"]["name"]
                    if novo_status == "finalizado":
                        print(
                            f"  ✅ {nome_casa} x {nome_fora} — finalizado! Atualizando...")
                        processar_eventos(
                            supabase, page, [ev], ids_times, "atualizacao")
                    else:
                        print(
                            f"  ⏳ {nome_casa} x {nome_fora} — ainda agendado.")
                time.sleep(0.5)

        browser.close()

    print(f'\n{"=" * 65}')
    print(
        f'  ✅ Coleta finalizada — {datetime.now().strftime("%d/%m/%Y %H:%M")}')
    print(f'  Registros salvos : {total_salvos}')
    print(f'  Ignorados        : {total_ignorados}')
    print(f'{"=" * 65}')


if __name__ == '__main__':
    main()
