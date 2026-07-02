import { describe, expect, it } from 'vitest';
import {
  formatarData,
  formatarDiasFuncionamento,
  formatarHorario,
} from './agendamentoPublicoUtils';

describe('agendamentoPublicoUtils', () => {
  it('formata datas e horarios exibidos no agendamento publico', () => {
    expect(formatarData('2026-06-26')).toBe('26/06/2026');
    expect(formatarHorario('2026-06-26T14:30:00')).toBe('14:30');
  });

  it('formata os dias de funcionamento do negocio', () => {
    expect(formatarDiasFuncionamento([1, 3, 6])).toBe('Segunda, Quarta, Sábado');
    expect(formatarDiasFuncionamento([])).toBe('Dias não informados');
  });
});
