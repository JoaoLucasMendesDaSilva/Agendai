import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Scissors,
  Store,
  Users,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';
import PanelSkeleton from '../components/ui/PanelSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { listarAgendamentos } from '../services/agendamentosService';
import { buscarNegocio } from '../services/negocioService';
import { listarProfissionais } from '../services/profissionaisService';
import { listarServicos } from '../services/servicosService';
import {
  contarClientesUnicos,
  filtrarAgendamentosPorPeriodo,
  obterData,
} from './dashboardUtils';

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

function formatarDataLonga(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    weekday: 'long',
  }).format(data);
}

function obterAgendamentosHoje(agendamentos) {
  const hoje = new Date();

  return agendamentos
    .map((agendamento) => ({
      ...agendamento,
      dataInicio: obterData(agendamento),
    }))
    .filter(
      (agendamento) =>
        agendamento.dataInicio &&
        agendamento.dataInicio.toDateString() === hoje.toDateString(),
    )
    .sort((a, b) => a.dataInicio - b.dataInicio);
}

function montarRankingServicos(agendamentos) {
  const contagem = new Map();

  agendamentos.forEach((agendamento) => {
    const nome = agendamento.servico_nome;

    if (nome) {
      contagem.set(nome, (contagem.get(nome) || 0) + 1);
    }
  });

  return Array.from(contagem.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
    .slice(0, 4);
}

function formatarAtualizacao(data) {
  if (!data) {
    return 'Painel atualizado';
  }

  return `Atualizado às ${formatarHorario(data)}`;
}

function criarPlanilhaAgendamentos(agendamentos, xlsx) {
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
      String(agendamento.cliente_nome || ''),
      String(agendamento.cliente_telefone || ''),
      String(agendamento.cliente_email || ''),
      String(agendamento.servico_nome || ''),
      String(agendamento.profissional_nome || ''),
      String(agendamento.status || ''),
      String(agendamento.observacoes || ''),
    ]);
  const dados = [cabecalho, ...linhas];
  const planilha = xlsx.utils.aoa_to_sheet(dados);

  planilha['!cols'] = cabecalho.map((titulo, indice) => {
    const maiorConteudo = dados.reduce(
      (maior, linha) => Math.max(maior, String(linha[indice] || '').length),
      titulo.length,
    );

    return { wch: Math.min(Math.max(maiorConteudo + 2, 12), 50) };
  });

  if (planilha['!ref']) {
    planilha['!autofilter'] = { ref: planilha['!ref'] };
  }

  return planilha;
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

function resumirSemana(dadosSemana) {
  const total = dadosSemana.reduce((soma, dia) => soma + dia.total, 0);

  if (total === 0) {
    return 'Semana atual sem agendamentos registrados.';
  }

  const maiorTotal = Math.max(...dadosSemana.map((dia) => dia.total));
  const diasMaisMovimento = dadosSemana
    .filter((dia) => dia.total === maiorTotal)
    .map((dia) => dia.label)
    .join(', ');

  return `Semana atual com ${total} agendamento${total === 1 ? '' : 's'}; maior movimento em ${diasMaisMovimento}.`;
}

function Dashboard({ navigate }) {
  const { logout, usuario } = useAuth();
  const { isDark } = useTheme();
  const montadoRef = useRef(false);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [periodoRelatorio, setPeriodoRelatorio] = useState(obterPeriodoMesAtual);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
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

      setAtualizadoEm(new Date());

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

  const resumoSemana = useMemo(
    () => resumirSemana(dadosSemana),
    [dadosSemana],
  );

  const agendamentosHoje = useMemo(
    () => obterAgendamentosHoje(agendamentos),
    [agendamentos],
  );

  const rankingServicos = useMemo(
    () => montarRankingServicos(agendamentos),
    [agendamentos],
  );

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const verdeBarra = rootStyles.getPropertyValue('--green-700').trim() || '#00816f';
    const verdeBorda = rootStyles.getPropertyValue('--green-800').trim() || '#006b5a';
    const textoSuave = rootStyles.getPropertyValue('--gray-500').trim() || '#667085';
    const linhaGrade = isDark
      ? 'rgba(45, 58, 71, 0.9)'
      : 'rgba(223, 229, 236, 0.9)';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
            backgroundColor: verdeBarra,
            borderColor: verdeBorda,
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 42,
          },
        ],
      },
      options: {
        animation: reducedMotion
          ? false
          : {
              duration: 520,
              easing: 'easeOutQuart',
            },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDark ? '#101c1b' : '#101727',
            borderColor: isDark ? '#2d3a47' : '#dfe5ec',
            borderWidth: 1,
            displayColors: false,
            padding: 10,
            titleFont: {
              family: 'Poppins',
              weight: 700,
            },
            bodyFont: {
              family: 'Poppins',
            },
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
              color: textoSuave,
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
              color: textoSuave,
              font: {
                family: 'Poppins',
              },
            },
            grid: {
              color: linhaGrade,
            },
          },
        },
      },
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [dadosSemana, isDark]);

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

  async function exportarAgendamentosXlsx() {
    setErro('');

    if (!periodoRelatorio.inicio || !periodoRelatorio.fim) {
      setErro('Informe o início e o fim do período para exportar.');
      return;
    }

    if (periodoRelatorio.inicio > periodoRelatorio.fim) {
      setErro('A data inicial não pode ser maior que a data final.');
      return;
    }

    setExportandoExcel(true);

    try {
      const XLSX = await import('xlsx');
      const agendamentosPeriodo = filtrarAgendamentosPorPeriodo(
        agendamentos,
        periodoRelatorio.inicio,
        periodoRelatorio.fim,
      );
      const planilha = criarPlanilhaAgendamentos(agendamentosPeriodo, XLSX);
      const pastaTrabalho = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(pastaTrabalho, planilha, 'Agendamentos');
      XLSX.writeFile(
        pastaTrabalho,
        `agendamentos-${periodoRelatorio.inicio}-${periodoRelatorio.fim}.xlsx`,
        { compression: true },
      );
    } catch {
      setErro('Não foi possível exportar os agendamentos.');
    } finally {
      setExportandoExcel(false);
    }
  }

  const metricas = [
    {
      titulo: 'Total de agendamentos',
      valor: agendamentos.length,
      detalhe: 'Histórico do negócio',
      Icone: CalendarCheck,
    },
    {
      titulo: 'Clientes únicos',
      valor: contarClientesUnicos(agendamentos),
      detalhe: 'Por telefone, e-mail ou nome',
      Icone: Users,
      classeIcone: 'metric-blue',
    },
    {
      titulo: 'Serviços ativos',
      valor: servicos.length,
      detalhe: 'Disponíveis para agendar',
      Icone: Scissors,
      classeIcone: 'metric-yellow',
    },
    {
      titulo: 'Profissionais ativos',
      valor: profissionais.length,
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
      <PageHeader
        title={`Olá, ${usuario?.nome?.trim().split(/\s+/)[0] || 'empreendedor'}.`}
        description={`Acompanhe o que acontece ${negocio?.nome ? `na ${negocio.nome}` : 'no seu negócio'} hoje.`}
        meta={
          <div className="dashboard-header-meta">
            <span className="dashboard-date-chip">
              <CalendarDays aria-hidden="true" size={17} />
              {formatarDataLonga(new Date())}
            </span>
            <span className="dashboard-freshness" aria-live="polite">
              {carregando ? 'Atualizando dados' : formatarAtualizacao(atualizadoEm)}
            </span>
          </div>
        }
      />

      {erro && <p className="message message-error">{erro}</p>}

      <section className="metrics-grid dashboard-metrics" aria-label="Indicadores do negócio">
        {metricas.map((metrica) => (
          <MetricCard key={metrica.titulo} loading={carregando} {...metrica} />
        ))}
      </section>

      <section className="dashboard-grid daily-dashboard-grid" aria-label="Atendimento do dia">
        <Panel
          className="next-appointment-panel"
          title="Próximo agendamento"
          titleId="next-title"
          description="O próximo compromisso pendente ou confirmado."
          actions={
            <button
              className="panel-link-button"
              onClick={() => navigate('/agenda')}
              type="button"
            >
              Abrir agenda <ChevronRight aria-hidden="true" size={16} />
            </button>
          }
        >

          {carregando && <PanelSkeleton lines={3} />}

          {!carregando && proximoAgendamento && (
            <div className="next-appointment-card">
              <span className="next-appointment-avatar" aria-hidden="true">
                {proximoAgendamento.cliente_nome?.charAt(0).toUpperCase() || 'C'}
              </span>
              <div className="next-appointment-person">
                <strong>{proximoAgendamento.cliente_nome}</strong>
                <span>{proximoAgendamento.servico_nome || 'Serviço não informado'}</span>
                <small>com {proximoAgendamento.profissional_nome || 'profissional não informado'}</small>
              </div>
              <div className="next-appointment-time">
                <strong>{formatarHorario(proximoAgendamento.dataInicio)}</strong>
                <span>{formatarData(proximoAgendamento.dataInicio)}</span>
                <em className={`status-badge status-${proximoAgendamento.status}`}>
                  {proximoAgendamento.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                </em>
              </div>
            </div>
          )}

          {!carregando && !proximoAgendamento && (
            <EmptyState Icone={CalendarDays} title="Nenhum próximo agendamento">
              Quando houver horários pendentes ou confirmados, o próximo
              atendimento aparecerá aqui.
            </EmptyState>
          )}
        </Panel>

        <Panel
          className="weekly-chart-panel"
          title="Agendamentos da semana"
          titleId="week-title"
          description="Volume diário da semana atual."
        >
          <p className="chart-summary">{resumoSemana}</p>
          <div className="dashboard-chart">
            {carregando && (
              <div className="chart-loading" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            )}
            <canvas ref={chartRef} aria-label="Gráfico de agendamentos da semana" />
          </div>
        </Panel>
      </section>

      <section className="dashboard-secondary-grid" aria-label="Resumo operacional">
        <Panel
          className="today-agenda-panel"
          title="Agenda de hoje"
          titleId="today-agenda-title"
          actions={
            <button className="panel-link-button" onClick={() => navigate('/agenda')} type="button">
              Ver tudo <ChevronRight aria-hidden="true" size={16} />
            </button>
          }
        >
          {carregando && <PanelSkeleton lines={3} />}
          {!carregando && agendamentosHoje.length === 0 && (
            <EmptyState Icone={CalendarDays} title="Nenhum atendimento hoje">
              A agenda está livre para esta data.
            </EmptyState>
          )}
          {!carregando && agendamentosHoje.length > 0 && (
            <div className="today-schedule-list">
              {agendamentosHoje.slice(0, 5).map((agendamento) => (
                <div className="today-schedule-row" key={agendamento.id}>
                  <time>{formatarHorario(agendamento.dataInicio)}</time>
                  <span className="today-schedule-marker" aria-hidden="true" />
                  <div>
                    <strong>{agendamento.cliente_nome}</strong>
                    <small>{agendamento.servico_nome}</small>
                  </div>
                  <span className={`status-badge status-${agendamento.status}`}>
                    {agendamento.status === 'concluido'
                      ? 'Concluído'
                      : agendamento.status === 'cancelado'
                        ? 'Cancelado'
                        : agendamento.status === 'confirmado'
                          ? 'Confirmado'
                          : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          className="service-ranking-panel"
          title="Serviços em destaque"
          titleId="service-ranking-title"
          actions={
            <button className="panel-link-button" onClick={() => navigate('/servicos')} type="button">
              Gerenciar <ChevronRight aria-hidden="true" size={16} />
            </button>
          }
        >
          {carregando && <PanelSkeleton lines={3} />}
          {!carregando && rankingServicos.length === 0 && (
            <EmptyState Icone={Scissors} title="Sem dados de serviços">
              O ranking será preenchido conforme os clientes agendarem.
            </EmptyState>
          )}
          {!carregando && rankingServicos.length > 0 && (
            <ol className="service-ranking-list">
              {rankingServicos.map((servico, indice) => (
                <li key={servico.nome}>
                  <span>{indice + 1}</span>
                  <div>
                    <div>
                      <strong>{servico.nome}</strong>
                      <small>{servico.total} agendamento{servico.total === 1 ? '' : 's'}</small>
                    </div>
                    <i aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.max(
                            12,
                            (servico.total / rankingServicos[0].total) * 100,
                          )}%`,
                        }}
                      />
                    </i>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </section>

      <section className="shortcut-strip" aria-label="Atalhos do sistema">
        {[
          { path: '/negocio', label: 'Meu negócio', detail: 'Dados e link público', Icon: Store },
          { path: '/servicos', label: 'Serviços', detail: 'Preços e duração', Icon: Scissors },
          { path: '/profissionais', label: 'Profissionais', detail: 'Equipe de atendimento', Icon: Users },
        ].map(({ path, label, detail, Icon }) => (
          <button className="quick-action" key={path} onClick={() => navigate(path)} type="button">
            <span className="quick-icon" aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>
            <strong>{label}</strong>
            <small>{detail}</small>
            <ChevronRight className="quick-action-arrow" aria-hidden="true" size={17} />
          </button>
        ))}
      </section>

      <Panel
        className="report-panel"
        title="Relatórios e exportações"
        titleId="report-title"
        description="Use quando precisar apresentar ou analisar um período específico."
        icon={
          <span className="summary-icon" aria-hidden="true">
            <Clock3 size={22} strokeWidth={2} />
          </span>
        }
      >
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
              disabled={carregando || gerandoRelatorio || exportandoExcel}
              onClick={gerarRelatorioPdf}
              type="button"
            >
              {gerandoRelatorio ? 'Gerando...' : 'Gerar relatório PDF'}
            </button>
            <button
              className="button button-secondary"
              disabled={carregando || gerandoRelatorio || exportandoExcel}
              onClick={exportarAgendamentosXlsx}
              type="button"
            >
              {exportandoExcel ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>
        </div>
      </Panel>
    </DashboardShell>
  );
}

export default Dashboard;
