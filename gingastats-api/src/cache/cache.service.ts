import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';

export const TTL = {
  ANALISE_IA: 72 * 60 * 60 * 1000,
  CONFRONTO: 1 * 60 * 60 * 1000,
  PARTIDAS_LIST: 15 * 60 * 1000,
} as const;

@Injectable()
export class CacheService {
  private readonly logger = new Logger('Cache');

  constructor(@Inject(CACHE_MANAGER) private cache: Cache) { }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cache.get<T>(key);
    if (value) {
      this.logger.log(`✅ HIT  → ${key}`);
    } else {
      this.logger.log(`❌ MISS → ${key}`);
    }
    return value ?? null;
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    await this.cache.set(key, value, ttl);
    const ttlFormatted = ttl >= 3600000
      ? `${ttl / 3600000}h`
      : ttl >= 60000
        ? `${ttl / 60000}min`
        : `${ttl / 1000}s`;
    this.logger.log(`💾 SET  → ${key} (expira em ${ttlFormatted})`);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
    this.logger.log(`🗑️  DEL  → ${key}`);
  }

  keyAnaliseIa(partidaId: number, jogos: number) { return `analise_ia:${partidaId}:j${jogos}`; }
  keyConfronto(partidaId: number, jogos: number) { return `confronto:${partidaId}:j${jogos}`; }
  keyPartidas() { return `partidas:agendadas`; }
}