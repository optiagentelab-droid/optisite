// Motor de navegação e render das telas. Cada etapa tem uma seção com
// id `etapa-<nome>` em ORDEM_ETAPAS. As funções de render específicas de
// cada tela (renderizarClinica, renderizarProcedimentos, ...) são
// definidas nos próximos módulos e chamadas aqui de forma opcional —
// assim este arquivo não precisa mudar quando uma nova tela ganha lógica.

const RENDERIZADORES_ETAPA = {
  clinica:       () => window.renderizarClinica?.(),
  procedimentos: () => window.renderizarProcedimentos?.(),
  profissionais: () => window.renderizarProfissionais?.(),
  revisao:       () => window.renderizarRevisao?.(),
  confirmacao:   () => window.renderizarConfirmacao?.(),
};

// Validadores rodam ao tentar avançar. Retornam false (e impedem o avanço)
// quando a própria etapa marcou algum campo como inválido.
const VALIDADORES_ETAPA = {
  clinica:       () => window.validarClinica?.() ?? true,
  procedimentos: () => window.validarProcedimentos?.() ?? true,
  // Rede de segurança: a navegação de dentro da etapa 03 já valida cada
  // profissional antes de avançar (ver avancarDentroDeProfissionais).
  profissionais: () => window.validarProfissionais?.() ?? true,
  revisao:       () => window.validarRevisao?.() ?? true,
};

const NUMERO_PROGRESSO = { clinica: 1, procedimentos: 2, profissionais: 3, revisao: 3 };

function renderizarEtapaAtual() {
  document.querySelectorAll('.etapa').forEach(el => el.classList.remove('etapa--ativa'));

  const nomeEtapa = ORDEM_ETAPAS[estado.etapa];
  const secao = document.getElementById('etapa-' + nomeEtapa);
  if (secao) secao.classList.add('etapa--ativa');

  renderizarProgresso(nomeEtapa);
  RENDERIZADORES_ETAPA[nomeEtapa]?.();

  window.scrollTo(0, 0);
}

function renderizarProgresso(nomeEtapa) {
  const nav = document.getElementById('progresso');
  const numero = NUMERO_PROGRESSO[nomeEtapa];

  if (!numero) {
    nav.hidden = true;
    return;
  }
  nav.hidden = false;

  const emRevisao = nomeEtapa === 'revisao';
  nav.querySelectorAll('.progresso__item').forEach(item => {
    const n = Number(item.dataset.etapa);
    item.classList.toggle('progresso__item--ativo', !emRevisao && n === numero);
    item.classList.toggle('progresso__item--feita', emRevisao || n < numero);
  });
}

function irPara(indice) {
  if (indice < 0 || indice >= ORDEM_ETAPAS.length) return;
  estado.etapa = indice;
  renderizarEtapaAtual();
  // A confirmação já limpa o rascunho ao renderizar (ver renderizarConfirmacao);
  // salvar de novo aqui reescreveria a chave que acabou de ser removida.
  if (ORDEM_ETAPAS[indice] !== 'confirmacao') salvarRascunho();
}

function avancarEtapa() {
  irPara(estado.etapa + 1);
}

function voltarEtapa() {
  irPara(estado.etapa - 1);
}

function retomarRascunho() {
  const rascunho = carregarRascunho();
  if (!rascunho) return;
  estado = rascunho;
  esconderBannerRascunho();
  renderizarEtapaAtual();
}

function descartarRascunho() {
  limparRascunho();
  esconderBannerRascunho();
}

function esconderBannerRascunho() {
  document.getElementById('banner-rascunho').hidden = true;
}

function ligarEventosNavegacao() {
  // Delegação de eventos: um listener cobre os botões de avançar/voltar
  // de todas as etapas, presentes e futuras.
  document.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-acao]');
    if (!alvo) return;

    if (alvo.dataset.acao === 'avancar') {
      const nomeEtapa = ORDEM_ETAPAS[estado.etapa];
      const valido = VALIDADORES_ETAPA[nomeEtapa]?.() ?? true;
      if (valido) avancarEtapa();
    }
    if (alvo.dataset.acao === 'voltar') voltarEtapa();
    if (alvo.dataset.acao === 'confirmar-cadastro') confirmarCadastro();
  });

  document.getElementById('botao-retomar').addEventListener('click', retomarRascunho);
  document.getElementById('botao-descartar').addEventListener('click', descartarRascunho);
}

// ============================================================================
// 01 · A clínica
// ============================================================================

function renderizarClinica() {
  document.getElementById('input-clinica-nome').value = estado.clinica.nome;
  document.getElementById('input-clinica-telefone').value = mascararTelefone(estado.clinica.telefone);
  document.getElementById('input-clinica-email').value = estado.clinica.email_admin;
  document.getElementById('input-clinica-endereco').value = estado.clinica.endereco;
  document.getElementById('input-clinica-abertura').value = estado.clinica.horario_abertura;
  document.getElementById('input-clinica-fechamento').value = estado.clinica.horario_fechamento;
}

function validarClinica() {
  let primeiroInvalido = null;

  function checar(idCampo, invalido) {
    if (invalido) {
      marcarCampoInvalido(idCampo);
      primeiroInvalido = primeiroInvalido || idCampo;
    } else {
      limparCampoInvalido(idCampo);
    }
  }

  checar('campo-clinica-nome', estado.clinica.nome.trim() === '');
  checar('campo-clinica-telefone', !validarTelefone(estado.clinica.telefone));
  checar('campo-clinica-email', !validarEmail(estado.clinica.email_admin));
  checar('campo-clinica-abertura', !estado.clinica.horario_abertura);
  checar('campo-clinica-fechamento',
    !estado.clinica.horario_fechamento ||
    estado.clinica.horario_fechamento <= estado.clinica.horario_abertura);

  if (primeiroInvalido) {
    rolarAteCampo(primeiroInvalido);
    return false;
  }
  return true;
}

function ligarEventosClinica() {
  const secao = document.getElementById('etapa-clinica');

  secao.addEventListener('input', (evento) => {
    const alvo = evento.target;

    switch (alvo.id) {
      case 'input-clinica-nome':
        estado.clinica.nome = alvo.value;
        limparCampoInvalido('campo-clinica-nome');
        break;
      case 'input-clinica-telefone': {
        const digitos = apenasDigitos(alvo.value).slice(0, 11);
        estado.clinica.telefone = digitos;
        alvo.value = mascararTelefone(digitos);
        limparCampoInvalido('campo-clinica-telefone');
        break;
      }
      case 'input-clinica-email':
        estado.clinica.email_admin = alvo.value;
        limparCampoInvalido('campo-clinica-email');
        break;
      case 'input-clinica-endereco':
        estado.clinica.endereco = alvo.value;
        break;
      case 'input-clinica-abertura':
        estado.clinica.horario_abertura = alvo.value;
        limparCampoInvalido('campo-clinica-abertura');
        break;
      case 'input-clinica-fechamento':
        estado.clinica.horario_fechamento = alvo.value;
        limparCampoInvalido('campo-clinica-fechamento');
        break;
    }
  });
}

// ============================================================================
// 02 · Procedimentos
// ============================================================================

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

function encontrarProcedimento(ref) {
  return estado.procedimentos.find(p => p.ref === ref);
}

function procedimentoPorEspecialidade(nome) {
  return estado.procedimentos.find(p => p.especialidade === nome && !p.ehOutro);
}

function proximoRefProcedimento() {
  estado.contadorProcedimento = (estado.contadorProcedimento || 0) + 1;
  return 'p' + estado.contadorProcedimento;
}

// Estado transitório do upload — não é dado de negócio, não vai pro
// rascunho. "emAndamento"/"erro" só existem enquanto o navegador está
// aberto; um reload no meio de um envio simplesmente perde o progresso
// visual (o arquivo em si só conta quando `pdf_url` é gravado no estado).
let statusUploadGeral = { emAndamento: false, erro: null, nomeEnviando: null };
const statusUploadProcedimento = {};
let alvoUploadAtual = null;

function renderizarProcedimentos() {
  document.querySelectorAll('#etapa-procedimentos .chip[data-especialidade]').forEach(chip => {
    const nome = chip.dataset.especialidade;
    const selecionado = nome === '__outro__'
      ? estado.procedimentos.some(p => p.ehOutro)
      : !!procedimentoPorEspecialidade(nome);
    chip.classList.toggle('chip--selecionado', selecionado);
  });

  renderizarListaDuracoes();
  renderizarUploadGeral();
}

function renderizarListaDuracoes() {
  const lista = document.getElementById('lista-duracoes');

  lista.innerHTML = estado.procedimentos.map(p => `
    <div class="campo duracao-bloco" data-ref="${p.ref}">
      ${p.ehOutro ? `
        <label class="campo__rotulo">Nome do procedimento</label>
        <input class="input" type="text" data-campo="nome" data-ref="${p.ref}" value="${escaparHtml(p.especialidade)}" placeholder="Digite o nome do procedimento">
      ` : `<p class="duracao-bloco__nome">${escaparHtml(p.especialidade)}</p>`}

      <label class="campo__rotulo" style="margin-top:var(--espaco-2); display:block">Quanto dura a consulta de avaliação para este procedimento?</label>
      <div class="duracao-bloco__campo">
        <input class="input" type="number" step="5" min="5" inputmode="numeric" data-campo="duracao" data-ref="${p.ref}" value="${p.duracao_min || ''}">
        <span class="texto-secundario">minutos</span>
      </div>
      <div class="atalhos-duracao">
        <button type="button" class="atalho-duracao" data-atalho="30" data-ref="${p.ref}">30</button>
        <button type="button" class="atalho-duracao" data-atalho="45" data-ref="${p.ref}">45</button>
        <button type="button" class="atalho-duracao" data-atalho="60" data-ref="${p.ref}">60</button>
        <button type="button" class="atalho-duracao" data-atalho="90" data-ref="${p.ref}">90</button>
      </div>
      ${Number(p.duracao_min) > 0 ? `<button type="button" class="replicar" data-replicar-duracao="${p.ref}">aplicar esta duração aos demais</button>` : ''}
      ${linhaPdfProcedimento(p)}
      <p class="campo__erro"></p>
    </div>
  `).join('');
}

function linhaPdfProcedimento(p) {
  const status = statusUploadProcedimento[p.ref] || {};

  if (status.emAndamento) {
    return `
      <p class="pdf-linha">Enviando ${escaparHtml(status.nomeEnviando || '')}…</p>
      <div class="barra-progresso"><div class="barra-progresso__preenchimento"></div></div>
    `;
  }

  if (status.erro) {
    return `<p class="pdf-linha pdf-linha--erro">${escaparHtml(status.erro)}
      <button type="button" class="link-sutil" data-upload-pdf="${p.ref}">tentar novamente</button></p>`;
  }

  if (p.pdf_url) {
    return `<p class="pdf-linha">${escaparHtml(p.pdf_url_nome || 'arquivo.pdf')} ·
      <button type="button" class="link-sutil" data-remover-pdf="${p.ref}">remover</button></p>`;
  }

  if (estado.pdfGeral) {
    return `<p class="pdf-linha">usando o PDF geral ·
      <button type="button" class="link-sutil" data-upload-pdf="${p.ref}">enviar um específico</button></p>`;
  }

  return `<p class="pdf-linha">
    <button type="button" class="link-sutil" data-upload-pdf="${p.ref}">enviar um PDF de orientações específico (opcional)</button></p>`;
}

function renderizarUploadGeral() {
  const botao = document.getElementById('botao-pdf-geral');
  const status = document.getElementById('status-pdf-geral');
  if (!botao || !status) return;

  if (statusUploadGeral.emAndamento) {
    botao.disabled = true;
    status.innerHTML = `
      <p class="pdf-linha">Enviando ${escaparHtml(statusUploadGeral.nomeEnviando || '')}…</p>
      <div class="barra-progresso"><div class="barra-progresso__preenchimento"></div></div>
    `;
    return;
  }

  botao.disabled = false;

  if (statusUploadGeral.erro) {
    status.innerHTML = `<p class="pdf-linha pdf-linha--erro">${escaparHtml(statusUploadGeral.erro)}</p>`;
    botao.textContent = 'Tentar enviar novamente';
    return;
  }

  if (estado.pdfGeral) {
    botao.textContent = 'Substituir o PDF geral';
    status.innerHTML = `<p class="pdf-linha">${escaparHtml(estado.pdfGeralNome || 'arquivo.pdf')} ·
      <button type="button" class="link-sutil" id="botao-remover-pdf-geral">remover</button></p>`;
    return;
  }

  botao.textContent = 'Enviar um PDF de orientações para todos os procedimentos';
  status.innerHTML = '';
}

function acionarSeletorArquivo(alvo) {
  alvoUploadAtual = alvo;
  document.getElementById('input-arquivo-pdf').click();
}

async function aoSelecionarArquivoPdf(evento) {
  const arquivo = evento.target.files[0];
  evento.target.value = ''; // permite escolher o mesmo arquivo de novo, se precisar

  const alvo = alvoUploadAtual;
  alvoUploadAtual = null;
  if (!arquivo || !alvo) return;

  if (alvo === 'geral') {
    statusUploadGeral = { emAndamento: true, erro: null, nomeEnviando: arquivo.name };
    renderizarUploadGeral();

    try {
      const url = await subirPdf(arquivo);
      estado.pdfGeral = url;
      estado.pdfGeralNome = arquivo.name;
      statusUploadGeral = { emAndamento: false, erro: null, nomeEnviando: null };
    } catch {
      statusUploadGeral = {
        emAndamento: false, nomeEnviando: null,
        erro: 'Não foi possível enviar o arquivo. Tente novamente ou continue sem ele.',
      };
    }

    renderizarUploadGeral();
    renderizarListaDuracoes(); // procedimentos sem PDF específico passam a exibir "usando o PDF geral"
    return;
  }

  const proc = encontrarProcedimento(alvo);
  if (!proc) return;

  statusUploadProcedimento[alvo] = { emAndamento: true, erro: null, nomeEnviando: arquivo.name };
  renderizarListaDuracoes();

  try {
    const url = await subirPdf(arquivo);
    proc.pdf_url = url;
    proc.pdf_url_nome = arquivo.name;
    statusUploadProcedimento[alvo] = {};
  } catch {
    statusUploadProcedimento[alvo] = { erro: 'Não foi possível enviar o arquivo. Tente novamente ou continue sem ele.' };
  }

  renderizarListaDuracoes();
}

function removerPdfGeral() {
  estado.pdfGeral = null;
  estado.pdfGeralNome = null;
  renderizarUploadGeral();
  renderizarListaDuracoes();
}

function removerPdfProcedimento(ref) {
  const proc = encontrarProcedimento(ref);
  if (!proc) return;
  proc.pdf_url = null;
  proc.pdf_url_nome = null;
  renderizarListaDuracoes();
}

function alternarProcedimento(chave) {
  if (chave === '__outro__') {
    const existente = estado.procedimentos.find(p => p.ehOutro);
    if (existente) {
      estado.procedimentos = estado.procedimentos.filter(p => p !== existente);
    } else {
      estado.procedimentos.push({ ref: proximoRefProcedimento(), especialidade: '', duracao_min: '', pdf_url: null, pdf_url_nome: null, ehOutro: true });
    }
  } else {
    const existente = procedimentoPorEspecialidade(chave);
    if (existente) {
      estado.procedimentos = estado.procedimentos.filter(p => p !== existente);
    } else {
      estado.procedimentos.push({ ref: proximoRefProcedimento(), especialidade: chave, duracao_min: '', pdf_url: null, pdf_url_nome: null, ehOutro: false });
    }
  }

  if (estado.procedimentos.length > 0) esconderErroProcedimentos();
  renderizarProcedimentos();
}

function definirDuracao(ref, valorBruto) {
  const proc = encontrarProcedimento(ref);
  if (!proc) return;

  const valorLimpo = apenasDigitos(valorBruto);
  proc.duracao_min = valorLimpo;

  const bloco = document.querySelector(`.duracao-bloco[data-ref="${ref}"]`);
  if (!bloco) return;

  const input = bloco.querySelector('[data-campo="duracao"]');
  if (input && input.value !== valorLimpo) input.value = valorLimpo;

  let botaoReplicar = bloco.querySelector('[data-replicar-duracao]');
  if (Number(valorLimpo) > 0) {
    if (!botaoReplicar) {
      botaoReplicar = document.createElement('button');
      botaoReplicar.type = 'button';
      botaoReplicar.className = 'replicar';
      botaoReplicar.dataset.replicarDuracao = ref;
      botaoReplicar.textContent = 'aplicar esta duração aos demais';
      bloco.querySelector('.atalhos-duracao').insertAdjacentElement('afterend', botaoReplicar);
    }
  } else if (botaoReplicar) {
    botaoReplicar.remove();
  }

  bloco.classList.remove('campo--invalido');
}

function replicarDuracao(refOrigem) {
  const origem = encontrarProcedimento(refOrigem);
  if (!origem || !(Number(origem.duracao_min) > 0)) return;
  estado.procedimentos.forEach(p => { p.duracao_min = origem.duracao_min; });
  renderizarListaDuracoes();
}

function mostrarErroProcedimentos() {
  document.getElementById('erro-procedimentos').hidden = false;
}

function esconderErroProcedimentos() {
  document.getElementById('erro-procedimentos').hidden = true;
}

function validarProcedimentos() {
  esconderErroProcedimentos();
  document.querySelectorAll('#lista-duracoes .duracao-bloco').forEach(b => b.classList.remove('campo--invalido'));

  if (estado.procedimentos.length === 0) {
    mostrarErroProcedimentos();
    rolarAteCampo('erro-procedimentos');
    return false;
  }

  let primeiroInvalidoRef = null;

  for (const proc of estado.procedimentos) {
    const nomeInvalido = proc.ehOutro && proc.especialidade.trim() === '';
    const duracaoInvalida = !(Number(proc.duracao_min) > 0);

    if (nomeInvalido || duracaoInvalida) {
      const bloco = document.querySelector(`.duracao-bloco[data-ref="${proc.ref}"]`);
      bloco?.classList.add('campo--invalido');
      const erro = bloco?.querySelector('.campo__erro');
      if (erro) {
        erro.textContent = nomeInvalido
          ? 'Digite o nome do procedimento.'
          : 'Informe a duração da consulta de avaliação, em minutos.';
      }
      if (!primeiroInvalidoRef) primeiroInvalidoRef = proc.ref;
    }
  }

  if (primeiroInvalidoRef) {
    document.querySelector(`.duracao-bloco[data-ref="${primeiroInvalidoRef}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  return true;
}

function ligarEventosProcedimentos() {
  const secao = document.getElementById('etapa-procedimentos');

  secao.addEventListener('click', (evento) => {
    const chip = evento.target.closest('.chip[data-especialidade]');
    if (chip) {
      alternarProcedimento(chip.dataset.especialidade);
      return;
    }

    const atalho = evento.target.closest('.atalho-duracao');
    if (atalho) {
      definirDuracao(atalho.dataset.ref, atalho.dataset.atalho);
      return;
    }

    const replicar = evento.target.closest('[data-replicar-duracao]');
    if (replicar) {
      replicarDuracao(replicar.dataset.replicarDuracao);
      return;
    }

    if (evento.target.closest('#botao-pdf-geral')) {
      acionarSeletorArquivo('geral');
      return;
    }

    if (evento.target.closest('#botao-remover-pdf-geral')) {
      removerPdfGeral();
      return;
    }

    const uploadEspecifico = evento.target.closest('[data-upload-pdf]');
    if (uploadEspecifico) {
      acionarSeletorArquivo(uploadEspecifico.dataset.uploadPdf);
      return;
    }

    const removerEspecifico = evento.target.closest('[data-remover-pdf]');
    if (removerEspecifico) {
      removerPdfProcedimento(removerEspecifico.dataset.removerPdf);
    }
  });

  document.getElementById('input-arquivo-pdf').addEventListener('change', aoSelecionarArquivoPdf);

  secao.addEventListener('input', (evento) => {
    const alvo = evento.target;

    if (alvo.dataset.campo === 'duracao') {
      definirDuracao(alvo.dataset.ref, alvo.value);
    }
    if (alvo.dataset.campo === 'nome') {
      const proc = encontrarProcedimento(alvo.dataset.ref);
      if (proc) proc.especialidade = alvo.value;
      document.querySelector(`.duracao-bloco[data-ref="${alvo.dataset.ref}"]`)?.classList.remove('campo--invalido');
    }
  });
}

// ============================================================================
// 03 · Profissionais
// ============================================================================
//
// Etapa com duas sub-telas: "quantos profissionais" (uma vez) e o editor de
// um profissional por vez (repetido N vezes). `estado.profissionalAtual`
// guarda a página atual dentro dessa etapa — é por isso que os botões daqui
// usam `data-acao-prof` em vez do `data-acao` genérico: avançar/voltar aqui
// às vezes navega dentro da etapa, às vezes cruza para a etapa vizinha.

const NOMES_DIAS_CURTOS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NOMES_DIAS_COMPLETOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function sincronizarProcedimentosProfissionais() {
  // Se a clínica voltou pra etapa 02 e removeu um procedimento depois de já
  // ter criado os blocos de profissionais, tira o ref órfão — do contrário
  // a RPC recusa o cadastro inteiro com "procedimento desconhecido".
  const refsValidos = new Set(estado.procedimentos.map(p => p.ref));
  estado.profissionais.forEach(prof => {
    prof.procedimentos = prof.procedimentos.filter(ref => refsValidos.has(ref));
  });
}

function renderizarProfissionais() {
  sincronizarProcedimentosProfissionais();

  const temProfissionais = estado.profissionais.length > 0;
  document.getElementById('profissionais-quantidade').hidden = temProfissionais;
  document.getElementById('profissionais-editor').hidden = !temProfissionais;

  if (temProfissionais) renderizarProfissionalAtual();
}

function confirmarQuantidadeProfissionais(quantidade) {
  const campo = document.getElementById('campo-quantidade-outro');

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    campo.classList.add('campo--invalido');
    rolarAteCampo('campo-quantidade-outro');
    return;
  }
  campo.classList.remove('campo--invalido');

  estado.profissionais = Array.from({ length: quantidade }, () => ({
    nome: '',
    intervalo_min: 0,
    procedimentos: estado.procedimentos.map(p => p.ref),
    horarios: [],
  }));
  estado.profissionalAtual = 0;

  document.getElementById('profissionais-quantidade').hidden = true;
  document.getElementById('profissionais-editor').hidden = false;
  renderizarProfissionalAtual();
  salvarRascunho();
}

function horarioDoDia(prof, dia) {
  return prof.horarios.find(h => h.dia_semana === dia);
}

function renderizarProfissionalAtual() {
  const total = estado.profissionais.length;
  const indice = estado.profissionalAtual;
  const prof = estado.profissionais[indice];
  if (!prof) return;

  const diasOrdenados = prof.horarios.slice().sort((a, b) => a.dia_semana - b.dia_semana);

  const html = `
    <div class="profissional-cabecalho">
      <h3>Profissional</h3>
      <span class="profissional-cabecalho__contador">Profissional ${indice + 1} de ${total}</span>
    </div>

    <div class="campo" id="campo-prof-nome">
      <label class="campo__rotulo" for="input-prof-nome">Nome</label>
      <input class="input" type="text" id="input-prof-nome" value="${escaparHtml(prof.nome)}" placeholder="Nome do profissional">
      <p class="campo__erro">Informe o nome do profissional.</p>
    </div>

    <div class="campo" id="campo-prof-intervalo" style="max-width:220px">
      <label class="campo__rotulo" for="input-prof-intervalo">Intervalo entre uma consulta e outra</label>
      <div class="duracao-bloco__campo">
        <input class="input" type="number" step="5" min="0" inputmode="numeric" id="input-prof-intervalo" value="${prof.intervalo_min}">
        <span class="texto-secundario">minutos</span>
      </div>
      <div class="atalhos-duracao">
        <button type="button" class="atalho-duracao" data-atalho-intervalo="10">10</button>
        <button type="button" class="atalho-duracao" data-atalho-intervalo="15">15</button>
      </div>
    </div>

    <div class="campo">
      <label class="campo__rotulo">Procedimentos que atende</label>
      <p class="erro-geral" id="erro-prof-procedimentos" hidden>Selecione ao menos um procedimento.</p>
      <div class="lista-checkboxes">
        ${estado.procedimentos.map(p => `
          <label class="checkbox-linha">
            <input type="checkbox" data-checkbox-procedimento="${p.ref}" ${prof.procedimentos.includes(p.ref) ? 'checked' : ''}>
            ${escaparHtml(p.especialidade)}
          </label>
        `).join('')}
      </div>
    </div>

    <div class="campo">
      <label class="campo__rotulo">Dias de trabalho</label>
      <p class="erro-geral" id="erro-prof-dias" hidden>Selecione ao menos um dia de trabalho.</p>
      <div class="dias">
        ${NOMES_DIAS_CURTOS.map((letra, dia) => `
          <button type="button" class="dia-toggle ${horarioDoDia(prof, dia) ? 'dia-toggle--selecionado' : ''}" data-dia-toggle="${dia}">${letra}</button>
        `).join('')}
      </div>
      ${diasOrdenados.map(h => blocoDiaProfissional(prof, h)).join('')}
    </div>

    ${indice > 0 ? `
      <div class="campo">
        <label class="campo__rotulo">Copiar agenda de outro profissional</label>
        <div class="copiar-agenda">
          ${estado.profissionais.slice(0, indice).map((colega, i) => `
            <button type="button" class="botao botao--secundario" style="width:auto" data-copiar-agenda="${i}">${escaparHtml(colega.nome || ('Profissional ' + (i + 1)))}</button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="acoes">
      <button class="botao botao--voltar" data-acao-prof="anterior" type="button">Voltar</button>
      <button class="botao botao--avancar" data-acao-prof="proximo" type="button">${indice === total - 1 ? 'Continuar' : 'Próximo profissional'}</button>
    </div>
  `;

  document.getElementById('profissionais-editor').innerHTML = html;
}

function blocoDiaProfissional(prof, h) {
  // O gesto "replicar" só aparece junto do primeiro dia configurado
  // (primeira entrada no array, não o primeiro na ordem da semana).
  const primeiroConfigurado = prof.horarios[0];
  const mostrarReplicar = prof.horarios.length > 1 && primeiroConfigurado.dia_semana === h.dia_semana;

  return `
    <div class="campo dia-bloco" data-dia="${h.dia_semana}">
      <p class="dia-bloco__titulo">${NOMES_DIAS_COMPLETOS[h.dia_semana]}</p>
      <div class="dia-bloco__horario">
        <input class="input" type="time" data-campo-horario="inicio" data-dia="${h.dia_semana}" value="${h.hora_inicio}">
        <span class="texto-secundario">até</span>
        <input class="input" type="time" data-campo-horario="fim" data-dia="${h.dia_semana}" value="${h.hora_fim}">
      </div>
      ${mostrarReplicar ? `<button type="button" class="replicar" data-replicar-horario="${h.dia_semana}">aplicar este horário aos demais dias</button>` : ''}

      <div class="pausas">
        ${h.pausas.map((pa, i) => `
          <div class="pausa-linha">
            <input class="input" type="time" data-campo-pausa="inicio" data-dia="${h.dia_semana}" data-pausa-index="${i}" value="${pa.inicio}">
            <span class="texto-secundario">–</span>
            <input class="input" type="time" data-campo-pausa="fim" data-dia="${h.dia_semana}" data-pausa-index="${i}" value="${pa.fim}">
            <button type="button" class="link-sutil" data-remover-pausa="${h.dia_semana}" data-pausa-index="${i}">remover</button>
          </div>
        `).join('')}
        <div class="pausas-atalhos">
          <button type="button" class="link-sutil" data-adicionar-pausa="${h.dia_semana}">+ adicionar pausa</button>
          <button type="button" class="link-sutil" data-adicionar-almoco="${h.dia_semana}">almoço 12:00–13:00</button>
        </div>
      </div>

      <p class="campo__erro"></p>
    </div>
  `;
}

function alternarDiaProfissional(dia) {
  const prof = estado.profissionais[estado.profissionalAtual];
  const existente = horarioDoDia(prof, dia);

  if (existente) {
    prof.horarios = prof.horarios.filter(h => h !== existente);
  } else {
    prof.horarios.push({
      dia_semana: dia,
      hora_inicio: estado.clinica.horario_abertura,
      hora_fim: estado.clinica.horario_fechamento,
      pausas: [],
    });
  }

  document.getElementById('erro-prof-dias').hidden = true;
  renderizarProfissionalAtual();
}

function definirHorarioDia(dia, campo, valor) {
  const prof = estado.profissionais[estado.profissionalAtual];
  const h = horarioDoDia(prof, dia);
  if (!h) return;

  if (campo === 'inicio') h.hora_inicio = valor;
  if (campo === 'fim') h.hora_fim = valor;

  document.querySelector(`.dia-bloco[data-dia="${dia}"]`)?.classList.remove('campo--invalido');
}

function aplicarHorarioATodosDias(diaOrigem) {
  const prof = estado.profissionais[estado.profissionalAtual];
  const origem = horarioDoDia(prof, Number(diaOrigem));
  if (!origem) return;

  prof.horarios.forEach(h => {
    h.hora_inicio = origem.hora_inicio;
    h.hora_fim = origem.hora_fim;
  });

  renderizarProfissionalAtual();
}

function adicionarPausa(dia, pausa) {
  const prof = estado.profissionais[estado.profissionalAtual];
  const h = horarioDoDia(prof, Number(dia));
  if (!h) return;

  h.pausas.push(pausa);
  renderizarProfissionalAtual();
}

function removerPausa(dia, indice) {
  const prof = estado.profissionais[estado.profissionalAtual];
  const h = horarioDoDia(prof, Number(dia));
  if (!h) return;

  h.pausas.splice(Number(indice), 1);
  renderizarProfissionalAtual();
}

function definirPausaCampo(dia, indice, campo, valor) {
  const prof = estado.profissionais[estado.profissionalAtual];
  const h = horarioDoDia(prof, Number(dia));
  const pausa = h?.pausas[Number(indice)];
  if (!pausa) return;

  if (campo === 'inicio') pausa.inicio = valor;
  if (campo === 'fim') pausa.fim = valor;

  document.querySelector(`.dia-bloco[data-dia="${dia}"]`)?.classList.remove('campo--invalido');
}

function alternarProcedimentoProfissional(ref, marcado) {
  const prof = estado.profissionais[estado.profissionalAtual];

  if (marcado) {
    if (!prof.procedimentos.includes(ref)) prof.procedimentos.push(ref);
  } else {
    prof.procedimentos = prof.procedimentos.filter(r => r !== ref);
  }

  if (prof.procedimentos.length > 0) document.getElementById('erro-prof-procedimentos').hidden = true;
}

function copiarAgendaDe(indiceOrigem) {
  const origem = estado.profissionais[Number(indiceOrigem)];
  const prof = estado.profissionais[estado.profissionalAtual];
  if (!origem) return;

  prof.horarios = JSON.parse(JSON.stringify(origem.horarios));
  renderizarProfissionalAtual();
}

function validarProfissionalAtual() {
  const prof = estado.profissionais[estado.profissionalAtual];
  let temErro = false;
  let primeiroErroSeletor = null;

  function marcarPrimeiroErro(seletor) {
    temErro = true;
    primeiroErroSeletor = primeiroErroSeletor || seletor;
  }

  const campoNome = document.getElementById('campo-prof-nome');
  if (prof.nome.trim() === '') {
    campoNome.classList.add('campo--invalido');
    marcarPrimeiroErro('#campo-prof-nome');
  } else {
    campoNome.classList.remove('campo--invalido');
  }

  const erroProc = document.getElementById('erro-prof-procedimentos');
  if (prof.procedimentos.length === 0) {
    erroProc.hidden = false;
    marcarPrimeiroErro('#erro-prof-procedimentos');
  } else {
    erroProc.hidden = true;
  }

  const erroDias = document.getElementById('erro-prof-dias');
  if (prof.horarios.length === 0) {
    erroDias.hidden = false;
    marcarPrimeiroErro('#erro-prof-dias');
  } else {
    erroDias.hidden = true;
  }

  prof.horarios.forEach(h => {
    const bloco = document.querySelector(`.dia-bloco[data-dia="${h.dia_semana}"]`);
    if (!bloco) return;

    const erroEl = bloco.querySelector('.campo__erro');
    let mensagem = '';

    if (!h.hora_inicio || !h.hora_fim || h.hora_fim <= h.hora_inicio) {
      mensagem = 'O horário de saída deve ser posterior ao de entrada.';
    } else if (h.hora_inicio < estado.clinica.horario_abertura || h.hora_fim > estado.clinica.horario_fechamento) {
      mensagem = 'Esse expediente está fora do horário de funcionamento da clínica.';
    } else {
      for (let i = 0; i < h.pausas.length; i++) {
        const pa = h.pausas[i];
        if (!pa.inicio || !pa.fim || pa.fim <= pa.inicio) {
          mensagem = 'O fim da pausa deve ser posterior ao início.';
          break;
        }
        if (pa.inicio < h.hora_inicio || pa.fim > h.hora_fim) {
          mensagem = 'A pausa precisa estar dentro do expediente do dia.';
          break;
        }
        const sobrepoe = h.pausas.some((outra, j) => j !== i && pa.inicio < outra.fim && outra.inicio < pa.fim);
        if (sobrepoe) {
          mensagem = 'Essas pausas se sobrepõem.';
          break;
        }
      }
    }

    if (mensagem) {
      bloco.classList.add('campo--invalido');
      if (erroEl) erroEl.textContent = mensagem;
      marcarPrimeiroErro(`.dia-bloco[data-dia="${h.dia_semana}"]`);
    } else {
      bloco.classList.remove('campo--invalido');
    }
  });

  if (temErro && primeiroErroSeletor) {
    document.querySelector(primeiroErroSeletor)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return !temErro;
}

// Rede de segurança para VALIDADORES_ETAPA — checagem estrutural simples,
// sem marcar DOM (só o profissional em edição está na tela).
function validarProfissionais() {
  return estado.profissionais.length > 0 && estado.profissionais.every(p =>
    p.nome.trim() !== '' && p.procedimentos.length > 0 && p.horarios.length > 0
  );
}

function avancarDentroDeProfissionais() {
  if (!validarProfissionalAtual()) return;

  if (estado.profissionalAtual < estado.profissionais.length - 1) {
    estado.profissionalAtual++;
    renderizarProfissionalAtual();
    salvarRascunho();
  } else {
    avancarEtapa();
  }
}

function voltarDentroDeProfissionais() {
  if (estado.profissionalAtual > 0) {
    estado.profissionalAtual--;
    renderizarProfissionalAtual();
    salvarRascunho();
  } else {
    voltarEtapa();
  }
}

function ligarEventosProfissionais() {
  const secao = document.getElementById('etapa-profissionais');

  secao.addEventListener('click', (evento) => {
    const chipQtd = evento.target.closest('[data-quantidade]');
    if (chipQtd) {
      confirmarQuantidadeProfissionais(Number(chipQtd.dataset.quantidade));
      return;
    }

    if (evento.target.closest('[data-acao-prof="confirmar-quantidade"]')) {
      confirmarQuantidadeProfissionais(Number(document.getElementById('input-quantidade-profissionais').value));
      return;
    }

    if (evento.target.closest('[data-acao-prof="voltar-quantidade"]')) {
      voltarEtapa();
      return;
    }

    if (evento.target.closest('[data-acao-prof="proximo"]')) {
      avancarDentroDeProfissionais();
      return;
    }

    if (evento.target.closest('[data-acao-prof="anterior"]')) {
      voltarDentroDeProfissionais();
      return;
    }

    const diaToggle = evento.target.closest('[data-dia-toggle]');
    if (diaToggle) {
      alternarDiaProfissional(Number(diaToggle.dataset.diaToggle));
      return;
    }

    const atalhoIntervalo = evento.target.closest('[data-atalho-intervalo]');
    if (atalhoIntervalo) {
      const valor = atalhoIntervalo.dataset.atalhoIntervalo;
      document.getElementById('input-prof-intervalo').value = valor;
      estado.profissionais[estado.profissionalAtual].intervalo_min = Number(valor);
      return;
    }

    const replicarHorario = evento.target.closest('[data-replicar-horario]');
    if (replicarHorario) {
      aplicarHorarioATodosDias(replicarHorario.dataset.replicarHorario);
      return;
    }

    const adicionarPausaBtn = evento.target.closest('[data-adicionar-pausa]');
    if (adicionarPausaBtn) {
      adicionarPausa(adicionarPausaBtn.dataset.adicionarPausa, { inicio: '', fim: '' });
      return;
    }

    const adicionarAlmocoBtn = evento.target.closest('[data-adicionar-almoco]');
    if (adicionarAlmocoBtn) {
      adicionarPausa(adicionarAlmocoBtn.dataset.adicionarAlmoco, { inicio: '12:00', fim: '13:00' });
      return;
    }

    const removerPausaBtn = evento.target.closest('[data-remover-pausa]');
    if (removerPausaBtn) {
      removerPausa(removerPausaBtn.dataset.removerPausa, removerPausaBtn.dataset.pausaIndex);
      return;
    }

    const copiarBtn = evento.target.closest('[data-copiar-agenda]');
    if (copiarBtn) {
      copiarAgendaDe(copiarBtn.dataset.copiarAgenda);
    }
  });

  secao.addEventListener('change', (evento) => {
    if (evento.target.dataset.checkboxProcedimento) {
      alternarProcedimentoProfissional(evento.target.dataset.checkboxProcedimento, evento.target.checked);
    }
  });

  secao.addEventListener('input', (evento) => {
    const alvo = evento.target;

    if (alvo.id === 'input-prof-nome') {
      estado.profissionais[estado.profissionalAtual].nome = alvo.value;
      document.getElementById('campo-prof-nome').classList.remove('campo--invalido');
    }

    if (alvo.id === 'input-prof-intervalo') {
      estado.profissionais[estado.profissionalAtual].intervalo_min = Number(apenasDigitos(alvo.value)) || 0;
    }

    if (alvo.dataset.campoHorario) {
      definirHorarioDia(Number(alvo.dataset.dia), alvo.dataset.campoHorario, alvo.value);
    }

    if (alvo.dataset.campoPausa) {
      definirPausaCampo(alvo.dataset.dia, alvo.dataset.pausaIndex, alvo.dataset.campoPausa, alvo.value);
    }
  });
}

// ============================================================================
// Revisão
// ============================================================================

function resumoClinica() {
  const c = estado.clinica;
  return `
    <p class="resumo-linha"><strong>${escaparHtml(c.nome)}</strong></p>
    <p class="resumo-linha">${escaparHtml(mascararTelefone(c.telefone))}</p>
    <p class="resumo-linha">${escaparHtml(c.email_admin)}</p>
    ${c.endereco ? `<p class="resumo-linha">${escaparHtml(c.endereco)}</p>` : ''}
    <p class="resumo-linha">Funciona das ${c.horario_abertura} às ${c.horario_fechamento}</p>
  `;
}

function resumoProcedimentos() {
  return estado.procedimentos.map(p => {
    const pdf = p.pdf_url ? 'PDF específico' : (estado.pdfGeral ? 'PDF geral' : 'sem PDF de orientações');
    return `<p class="resumo-linha"><strong>${escaparHtml(p.especialidade)}</strong> — ${escaparHtml(p.duracao_min)} min de avaliação · ${pdf}</p>`;
  }).join('');
}

function resumoProfissionais() {
  return estado.profissionais.map((prof, i) => {
    const nomesProc = prof.procedimentos
      .map(ref => estado.procedimentos.find(p => p.ref === ref)?.especialidade)
      .filter(Boolean)
      .join(', ');

    const dias = prof.horarios
      .slice()
      .sort((a, b) => a.dia_semana - b.dia_semana)
      .map(h => `${NOMES_DIAS_COMPLETOS[h.dia_semana]} ${h.hora_inicio}–${h.hora_fim}`)
      .join(' · ');

    return `
      <div class="resumo-profissional">
        <div class="linha-com-acao">
          <p class="resumo-linha"><strong>${escaparHtml(prof.nome)}</strong></p>
          <button type="button" class="link-sutil" data-editar-profissional="${i}">editar</button>
        </div>
        <p class="resumo-linha texto-secundario">${escaparHtml(nomesProc)}</p>
        <p class="resumo-linha texto-secundario">${escaparHtml(dias)}</p>
      </div>
    `;
  }).join('');
}

function renderizarRevisao() {
  document.getElementById('revisao-clinica').innerHTML = resumoClinica();
  document.getElementById('revisao-procedimentos').innerHTML = resumoProcedimentos();
  document.getElementById('revisao-profissionais').innerHTML = resumoProfissionais();
  document.getElementById('link-privacidade').href = URL_PRIVACIDADE;
}

function validarRevisao() {
  const campo = document.getElementById('campo-consentimento');
  const marcado = document.getElementById('input-consentimento').checked;

  campo.classList.toggle('campo--invalido', !marcado);
  if (!marcado) rolarAteCampo('campo-consentimento');

  return marcado;
}

async function confirmarCadastro() {
  if (!validarRevisao()) return;

  // Bot preencheu o campo que nenhum humano vê — descarta em silêncio,
  // sem chamar a RPC e sem dar qualquer pista de que foi barrado.
  const honeypot = document.getElementById('campo-empresa-confirmacao');
  if (honeypot && honeypot.value.trim() !== '') return;

  const botaoConfirmar = document.getElementById('botao-confirmar-cadastro');
  const botaoVoltar = document.querySelector('#etapa-revisao [data-acao="voltar"]');
  const erroEl = document.getElementById('erro-envio');
  const textoOriginal = botaoConfirmar.textContent;

  erroEl.hidden = true;
  botaoConfirmar.disabled = true;
  botaoVoltar.disabled = true;
  botaoConfirmar.textContent = 'Enviando...';

  try {
    const resultado = await enviarCadastro();
    estado.clinicaId = resultado.clinica_id;
    avancarEtapa();
  } catch (erro) {
    erroEl.textContent = mensagemErroEnvio(erro);
    erroEl.hidden = false;
    rolarAteCampo('erro-envio');
  } finally {
    botaoConfirmar.disabled = false;
    botaoVoltar.disabled = false;
    botaoConfirmar.textContent = textoOriginal;
  }
}

function ligarEventosRevisao() {
  const secao = document.getElementById('etapa-revisao');

  secao.addEventListener('click', (evento) => {
    const editarEtapa = evento.target.closest('[data-editar-etapa]');
    if (editarEtapa) {
      irPara(Number(editarEtapa.dataset.editarEtapa));
      return;
    }

    const editarProfissional = evento.target.closest('[data-editar-profissional]');
    if (editarProfissional) {
      estado.profissionalAtual = Number(editarProfissional.dataset.editarProfissional);
      irPara(3);
    }
  });

  document.getElementById('input-consentimento').addEventListener('change', (evento) => {
    if (evento.target.checked) {
      document.getElementById('campo-consentimento').classList.remove('campo--invalido');
    }
  });
}

// ============================================================================
// Confirmação
// ============================================================================

function frasePluralizada(quantidade, singular, plural) {
  const contagem = `${quantidade} ${quantidade === 1 ? singular : plural}`;
  return `${contagem} ${quantidade === 1 ? 'cadastrado' : 'cadastrados'}`;
}

function renderizarConfirmacao() {
  document.getElementById('confirmacao-clinica-id').textContent = estado.clinicaId ?? '—';
  document.getElementById('confirmacao-nome').textContent = estado.clinica.nome;
  document.getElementById('confirmacao-contagem-procedimentos').textContent =
    frasePluralizada(estado.procedimentos.length, 'procedimento', 'procedimentos');
  document.getElementById('confirmacao-contagem-profissionais').textContent =
    frasePluralizada(estado.profissionais.length, 'profissional', 'profissionais');
  limparRascunho();
}

document.addEventListener('DOMContentLoaded', () => {
  const rascunho = carregarRascunho();
  if (rascunho && rascunho.etapa > 0) {
    document.getElementById('banner-rascunho').hidden = false;
  }

  ligarEventosNavegacao();
  ligarEventosClinica();
  ligarEventosProcedimentos();
  ligarEventosRevisao();
  ligarEventosProfissionais();
  renderizarEtapaAtual();
});
