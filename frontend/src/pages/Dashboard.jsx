import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import {
  CalendarCheck,
  CalendarDays,
  FileText,
  Scissors,
  Store,
  Users,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';
import { listarAgendamentos } from '../services/agendamentosService';
import { buscarNegocio } from '../services/negocioService';
import { listarProfissionais } from '../services/profissionaisService';
import { listarServicos } from '../services/servicosService';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS_ATIVOS_AGENDA = ['pendente', 'confirmado'];

function obterPeriodoMesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  };
}

function obterData(agendamento) {
  const data = new Date(agendamento.data_hora_inicio);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);
}

function formatarHorario(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

function formatarDataHora(data) {
  if (!data) {
    return 'Data não informada';
  }

  return `${formatarData(data)} ${formatarHorario(data)}`;
}

function criarChaveCliente(agendamento) {
  const telefone = String(agendamento.cliente_telefone || '').replace(/\D/g, '');
  const email = String(agendamento.cliente_email || '').trim().toLowerCase();
  const nome = String(agendamento.cliente_nome || '').trim().toLowerCase();

  return telefone || email || nome;
}

function contarClientesUnicos(agendamentos) {
  const clientes = new Set();

  agendamentos.forEach((agendamento) => {
    const chave = criarChaveCliente(agendamento);

    if (chave) {
      clientes.add(chave);
    }
  });

  return clientes.size;
}

function filtrarAgendamentosPorPeriodo(agendamentos, inicio, fim) {
  const dataInicio = new Date(`${inicio}T00:00:00`);
  const dataFim = new Date(`${fim}T23:59:59`);

  return agendamentos.filter((agendamento) => {
    const data = obterData(agendamento);
    return data && data >= dataInicio && data <= dataFim;
  });
}

function escaparCelulaCsv(valor) {
  const texto = String(valor ?? '');
  const textoSeguro = /^[=+\-@]/.test(texto.trimStart()) ? `'${texto}` : texto;

  return `"${textoSeguro.replace(/"/g, '""')}"`;
}

function criarCsvAgendamentos(agendamentos) {
  const cabecalho = [
    'Data',
    'Horário',
    'Cliente',
    'Telefone',
    'E-mail',
    'Serviço',
    'Profissional',
    'Status',
    'Observações',
  ];
  const linhas = agendamentos
    .map((agendamento) => ({
      ...agendamento,
      dataInicio: obterData(agendamento),
    }))
    .sort((a, b) => (a.dataInicio?.getTime() || 0) - (b.dataInicio?.getTime() || 0))
    .map((agendamento) => [
      agendamento.dataInicio ? formatarData(agendamento.dataInicio) : '',
      agendamento.dataInicio ? formatarHorario(agendamento.dataInicio) : '',
      agendamento.cliente_nome,
      agendamento.cliente_telefone,
      agendamento.cliente_email,
      agendamento.servico_nome,
      agendamento.profissional_nome,
      agendamento.status,
      agendamento.observacoes,
    ]);

  return [cabecalho, ...linhas]
    .map((linha) => linha.map(escaparCelulaCsv).join(';'))
    .join('\r\n');
}

function encontrarMaisAgendado(agendamentos, campo) {
  const contagem = new Map();

  agendamentos.forEach((agendamento) => {
    const valor = agendamento[campo];

    if (valor) {
      contagem.set(valor, (contagem.get(valor) || 0) + 1);
    }
  });

  return Array.from(contagem.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nome, total]) => ({ nome, total }))[0];
}

function encontrarProximoAgendamento(agendamentos) {
  const agora = new Date();

  return agendamentos
    .filter((agendamento) => STATUS_ATIVOS_AGENDA.includes(agendamento.status))
    .map((agendamento) => ({
      ...agendamento,
      dataInicio: obterData(agendamento),
    }))
    .filter((agendamento) => agendamento.dataInicio && agendamento.dataInicio >= agora)
    .sort((a, b) => a.dataInicio - b.dataInicio)[0];
}

function obterInicioSemana(dataBase) {
  const inicio = new Date(dataBase);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return inicio;
}

function montarDadosSemana(agendamentos) {
  const inicioSemana = obterInicioSemana(new Date());
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 7);

  const valores = DIAS_SEMANA.map((label, index) => {
    const data = new Date(inicioSemana);
    data.setDate(inicioSemana.getDate() + index);

    return {
      label,
      data,
      total: 0,
    };
  });

  agendamentos.forEach((agendamento) => {
    const data = obterData(agendamento);

    if (!data || data < inicioSemana || data >= fimSemana) {
      return;
    }

    valores[data.getDay()].total += 1;
  });

  return valores;
}

function MetricCard({ Icone, classeIcone = '', titulo, valor, detalhe }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${classeIcone}`} aria-hidden="true">
        <Icone size={22} strokeWidth={2} />
      </span>
      <div>
        <p>{titulo}</p>
        <strong>{valor}</strong>
        <small>{detalhe}</small>
      </div>
    </article>
  );
}

function Dashboard({ navigate }) {
  const { logout, usuario } = useAuth();
  const montadoRef = useRef(false);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [periodoRelatorio, setPeriodoRelatorio] = useState(obterPeriodoMesAtual);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarIndicadores = useCallback(async (silencioso = false) => {
      if (!silencioso) {
        setCarregando(true);
      }
      setErro('');

      const [
        resultadoAgendamentos,
        resultadoServicos,
        resultadoProfissionais,
        resultadoNegocio,
      ] =
        await Promise.allSettled([
          listarAgendamentos(),
          listarServicos(),
          listarProfissionais(),
          buscarNegocio(),
        ]);

      if (!montadoRef.current) {
        return;
      }

      if (resultadoAgendamentos.status === 'fulfilled') {
        setAgendamentos(resultadoAgendamentos.value.agendamentos || []);
      } else if (!silencioso) {
        setAgendamentos([]);
      }

      if (resultadoServicos.status === 'fulfilled') {
        setServicos(resultadoServicos.value.servicos || []);
      } else if (!silencioso) {
        setServicos([]);
      }

      if (resultadoProfissionais.status === 'fulfilled') {
        setProfissionais(resultadoProfissionais.value.profissionais || []);
      } else if (!silencioso) {
        setProfissionais([]);
      }

      if (resultadoNegocio.status === 'fulfilled') {
        setNegocio(resultadoNegocio.value.negocio || null);
      } else if (!silencioso) {
        setNegocio(null);
      }

      const primeiraFalha = [
        resultadoAgendamentos,
        resultadoServicos,
        resultadoProfissionais,
      ].find((resultado) => resultado.status === 'rejected');

      if (primeiraFalha) {
        setErro(
          primeiraFalha.reason?.message ||
            'Não foi possível carregar todos os indicadores.',
        );
      }

      if (!silencioso) {
        setCarregando(false);
      }
  }, []);

  useEffect(() => {
    montadoRef.current = true;

    carregarIndicadores();

    function handleFocus() {
      carregarIndicadores(true);
    }

    window.addEventListener('focus', handleFocus);

    return () => {
      montadoRef.current = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [carregarIndicadores]);

  const proximoAgendamento = useMemo(
    () => encontrarProximoAgendamento(agendamentos),
    [agendamentos],
  );

  const dadosSemana = useMemo(
    () => montarDadosSemana(agendamentos),
    [agendamentos],
  );

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: dadosSemana.map((dia) => dia.label),
        datasets: [
          {
            label: 'Agendamentos',
            data: dadosSemana.map((dia) => dia.total),
            backgroundColor: 'rgba(0, 127, 111, 0.78)',
            borderColor: '#006b5a',
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 42,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label(context) {
                const total = context.parsed.y;
                return `${total} agendamento${total === 1 ? '' : 's'}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#667085',
              font: {
                family: 'Poppins',
                weight: 600,
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: '#667085',
              font: {
                family: 'Poppins',
              },
            },
            grid: {
              color: 'rgba(223, 229, 236, 0.9)',
            },
          },
        },
      },
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [dadosSemana]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function atualizarPeriodo(campo, valor) {
    setPeriodoRelatorio((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function gerarRelatorioPdf() {
    setErro('');

    if (!periodoRelatorio.inicio || !periodoRelatorio.fim) {
      setErro('Informe o início e o fim do período do relatório.');
      return;
    }

    if (periodoRelatorio.inicio > periodoRelatorio.fim) {
      setErro('A data inicial não pode ser maior que a data final.');
      return;
    }

    setGerandoRelatorio(true);

    try {
      const agendamentosPeriodo = filtrarAgendamentosPorPeriodo(
        agendamentos,
        periodoRelatorio.inicio,
        periodoRelatorio.fim,
      );
      const servicoMaisAgendado = encontrarMaisAgendado(
        agendamentosPeriodo,
        'servico_nome',
      );
      const profissionalMaisAgendado = encontrarMaisAgendado(
        agendamentosPeriodo,
        'profissional_nome',
      );
      const doc = new jsPDF();
      const margem = 14;
      const larguraTexto = 182;
      let y = 18;

      function escrever(texto, tamanho = 10, estilo = 'normal') {
        doc.setFont('helvetica', estilo);
        doc.setFontSize(tamanho);
        const linhas = doc.splitTextToSize(String(texto || ''), larguraTexto);
        doc.text(linhas, margem, y);
        y += linhas.length * (tamanho * 0.42) + 3;
      }

      function garantirEspaco(altura = 18) {
        if (y + altura > 280) {
          doc.addPage();
          y = 18;
        }
      }

      escrever('Relatório do Agendai', 18, 'bold');
      escrever(`Negócio: ${negocio?.nome || 'Negócio não cadastrado'}`, 12, 'bold');
      escrever(
        `Período: ${formatarData(new Date(`${periodoRelatorio.inicio}T00:00:00`))} a ${formatarData(
          new Date(`${periodoRelatorio.fim}T00:00:00`),
        )}`,
      );
      y += 3;

      escrever('Indicadores', 13, 'bold');
      escrever(`Total de agendamentos: ${agendamentosPeriodo.length}`);
      escrever(`Total de clientes únicos: ${contarClientesUnicos(agendamentosPeriodo)}`);
      escrever(`Total de serviços ativos: ${servicos.length}`);
      escrever(`Total de profissionais ativos: ${profissionais.length}`);
      escrever(
        `Serviço mais agendado: ${
          servicoMaisAgendado
            ? `${servicoMaisAgendado.nome} (${servicoMaisAgendado.total})`
            : 'Sem dados no período'
        }`,
      );
      escrever(
        `Profissional mais agendado: ${
          profissionalMaisAgendado
            ? `${profissionalMaisAgendado.nome} (${profissionalMaisAgendado.total})`
            : 'Sem dados no período'
        }`,
      );
      y += 3;

      escrever('Agendamentos do período', 13, 'bold');

      if (agendamentosPeriodo.length === 0) {
        escrever('Nenhum agendamento encontrado no período selecionado.');
      } else {
        agendamentosPeriodo
          .map((agendamento) => ({
            ...agendamento,
            dataInicio: obterData(agendamento),
          }))
          .sort((a, b) => (a.dataInicio?.getTime() || 0) - (b.dataInicio?.getTime() || 0))
          .slice(0, 60)
          .forEach((agendamento) => {
            garantirEspaco(22);
            escrever(
              `${formatarDataHora(agendamento.dataInicio)} - ${agendamento.cliente_nome || 'Cliente'} - ${
                agendamento.servico_nome || 'Serviço'
              } - ${agendamento.profissional_nome || 'Profissional'} - ${
                agendamento.status || 'status não informado'
              }`,
              9,
            );
          });

        if (agendamentosPeriodo.length > 60) {
          escrever(
            `Lista resumida: exibindo 60 de ${agendamentosPeriodo.length} agendamentos.`,
            9,
            'italic',
          );
        }
      }

      doc.save(`relatorio-agendai-${periodoRelatorio.inicio}-${periodoRelatorio.fim}.pdf`);
    } catch {
      setErro('Não foi possível gerar o relatório PDF.');
    } finally {
      setGerandoRelatorio(false);
    }
  }

  function exportarAgendamentosCsv() {
    setErro('');

    if (!periodoRelatorio.inicio || !periodoRelatorio.fim) {
      setErro('Informe o início e o fim do período para exportar.');
      return;
    }

    if (periodoRelatorio.inicio > periodoRelatorio.fim) {
      setErro('A data inicial não pode ser maior que a data final.');
      return;
    }

    try {
      const agendamentosPeriodo = filtrarAgendamentosPorPeriodo(
        agendamentos,
        periodoRelatorio.inicio,
        periodoRelatorio.fim,
      );
      const csv = criarCsvAgendamentos(agendamentosPeriodo);
      const arquivo = new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');

      link.href = url;
      link.download = `agendamentos-${periodoRelatorio.inicio}-${periodoRelatorio.fim}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErro('Não foi possível exportar os agendamentos.');
    }
  }

  const metricas = [
    {
      titulo: 'Total de agendamentos',
      valor: carregando ? '...' : agendamentos.length,
      detalhe: 'Histórico do negócio',
      Icone: CalendarCheck,
    },
    {
      titulo: 'Clientes únicos',
      valor: carregando ? '...' : contarClientesUnicos(agendamentos),
      detalhe: 'Por telefone, e-mail ou nome',
      Icone: Users,
      classeIcone: 'metric-blue',
    },
    {
      titulo: 'Serviços ativos',
      valor: carregando ? '...' : servicos.length,
      detalhe: 'Disponíveis para agendar',
      Icone: Scissors,
      classeIcone: 'metric-yellow',
    },
    {
      titulo: 'Profissionais ativos',
      valor: carregando ? '...' : profissionais.length,
      detalhe: 'Equipe de atendimento',
      Icone: Store,
    },
  ];

  return (
    <DashboardShell
      currentPath="/dashboard"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <header className="page-title">
        <div>
          <p className="eyebrow">Visão geral do seu negócio</p>
          <h1>Dashboard</h1>
          <p className="panel-text">
            Acompanhe indicadores reais do atendimento em um painel simples.
          </p>
        </div>
      </header>

      {erro && <p className="message message-error">{erro}</p>}

      <section className="metrics-grid" aria-label="Indicadores do negócio">
        {metricas.map((metrica) => (
          <MetricCard key={metrica.titulo} {...metrica} />
        ))}
      </section>

      <section className="dashboard-panel report-panel" aria-labelledby="report-title">
        <div className="panel-heading">
          <div>
            <h2 id="report-title">Relatório PDF</h2>
            <p className="panel-text">
              Gere um resumo do negócio usando os dados reais do período.
            </p>
          </div>
          <span className="summary-icon" aria-hidden="true">
            <FileText size={24} strokeWidth={2} />
          </span>
        </div>

        <div className="report-controls">
          <label>
            Início
            <input
              onChange={(event) => atualizarPeriodo('inicio', event.target.value)}
              type="date"
              value={periodoRelatorio.inicio}
            />
          </label>
          <label>
            Fim
            <input
              onChange={(event) => atualizarPeriodo('fim', event.target.value)}
              type="date"
              value={periodoRelatorio.fim}
            />
          </label>
          <div className="button-row">
            <button
              className="button button-primary"
              disabled={carregando || gerandoRelatorio}
              onClick={gerarRelatorioPdf}
              type="button"
            >
              {gerandoRelatorio ? 'Gerando...' : 'Gerar relatório PDF'}
            </button>
            <button
              className="button button-secondary"
              disabled={carregando || gerandoRelatorio}
              onClick={exportarAgendamentosCsv}
              type="button"
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel" aria-labelledby="next-title">
          <div className="panel-heading">
            <div>
              <h2 id="next-title">Próximo agendamento</h2>
              <p className="panel-text">
                Próximo horário pendente ou confirmado na agenda.
              </p>
            </div>
            <button
              className="button button-secondary button-small"
              onClick={() => navigate('/agenda')}
              type="button"
            >
              Ver agenda
            </button>
          </div>

          {carregando && (
            <p className="message message-info" aria-live="polite">
              Carregando indicadores...
            </p>
          )}

          {!carregando && proximoAgendamento && (
            <div className="next-appointment-card">
              <span className="empty-icon" aria-hidden="true">
                <CalendarDays size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>{proximoAgendamento.cliente_nome}</strong>
                <dl className="next-appointment-details">
                  <div>
                    <dt>Data</dt>
                    <dd>{formatarData(proximoAgendamento.dataInicio)}</dd>
                  </div>
                  <div>
                    <dt>Horário</dt>
                    <dd>{formatarHorario(proximoAgendamento.dataInicio)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {!carregando && !proximoAgendamento && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <CalendarDays size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Nenhum próximo agendamento</strong>
                <p>
                  Quando houver horários pendentes ou confirmados, o próximo
                  atendimento aparecerá aqui.
                </p>
              </div>
            </div>
          )}
        </article>

        <article className="dashboard-panel" aria-labelledby="week-title">
          <div className="panel-heading">
            <div>
              <h2 id="week-title">Agendamentos da semana</h2>
              <p className="panel-text">
                Quantidade de agendamentos por dia na semana atual.
              </p>
            </div>
          </div>
          <div className="dashboard-chart">
            <canvas ref={chartRef} aria-label="Gráfico de agendamentos da semana" />
          </div>
        </article>
      </section>

      <section className="shortcut-strip" aria-label="Atalhos do sistema">
        <button
          className="quick-action"
          onClick={() => navigate('/negocio')}
          type="button"
        >
          <span className="quick-icon" aria-hidden="true">
            <Store size={20} strokeWidth={2} />
          </span>
          <strong>Meu negócio</strong>
          <small>Dados e link público</small>
        </button>
        <button
          className="quick-action"
          onClick={() => navigate('/servicos')}
          type="button"
        >
          <span className="quick-icon" aria-hidden="true">
            <Scissors size={20} strokeWidth={2} />
          </span>
          <strong>Serviços</strong>
          <small>Preços e duração</small>
        </button>
        <button
          className="quick-action"
          onClick={() => navigate('/profissionais')}
          type="button"
        >
          <span className="quick-icon" aria-hidden="true">
            <Users size={20} strokeWidth={2} />
          </span>
          <strong>Profissionais</strong>
          <small>Equipe de atendimento</small>
        </button>
      </section>
    </DashboardShell>
  );
}

export default Dashboard;
