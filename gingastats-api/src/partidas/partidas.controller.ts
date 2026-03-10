import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PartidasService } from './partidas.service';

@Controller('partidas')
export class PartidasController {
    constructor(private readonly partidasService: PartidasService) { }

    // GET /partidas/agendadas
    // Lista todos os próximos confrontos disponíveis para análise
    @Get('agendadas')
    getAgendadas() {
        return this.partidasService.getAgendadas();
    }

    // GET /partidas/:id
    // Detalhes de uma partida específica
    @Get(':id')
    getById(@Param('id', ParseIntPipe) id: number) {
        return this.partidasService.getById(id);
    }
}