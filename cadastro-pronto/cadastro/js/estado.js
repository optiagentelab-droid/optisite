// Fonte única de verdade do formulário. Nunca leia valor do DOM para
// decidir lógica — o DOM é saída. Toda interação altera `estado` e chama
// a função de render da seção afetada (ver etapas.js).

const ORDEM_ETAPAS = ['abertura', 'clinica', 'procedimentos', 'profissionais', 'revisao', 'confirmacao'];

const CHAVE_RASCUNHO = 'optiagente_rascunho';

// crypto.randomUUID só existe em contexto seguro (https, ou http no
// localhost). Em LAN por IP (http://192.168.x.x) ele não existe — sem
// fallback, isso quebra a criação do estado inicial e trava a página
// inteira em branco. O uuid aqui só nomeia uma pasta temporária no
// Storage, não precisa ser criptograficamente forte.
function gerarUuidSessao() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function estadoInicial() {
  return {
    etapa: 0,
    uuidSessao: gerarUuidSessao(),
    clinica: {
      nome: '', telefone: '', email_admin: '', endereco: '',
      horario_abertura: '09:00', horario_fechamento: '18:00'
    },
    pdfGeral: null,
    pdfGeralNome: null, // só para exibição — o nome do arquivo enviado como PDF geral
    // Só cresce — refs nunca são reaproveitados mesmo depois de remover
    // um procedimento (a RPC recusa refs duplicados).
    contadorProcedimento: 0,
    procedimentos: [
      // { ref: 'p1', especialidade: '', duracao_min: '', pdf_url: null, pdf_url_nome: null, ehOutro: false }
    ],
    // Índice do profissional em edição dentro da etapa 03 — cada um é
    // preenchido por completo antes do próximo, então essa etapa tem
    // sua própria "página atual" separada de `etapa`.
    profissionalAtual: 0,
    profissionais: [
      // {
      //   nome: '', intervalo_min: 0,
      //   procedimentos: ['p1', 'p2'],
      //   horarios: [
      //     { dia_semana: 1, hora_inicio: '09:00', hora_fim: '18:00',
      //       pausas: [{ inicio: '12:00', fim: '13:00' }] }
      //   ]
      // }
    ],
    // Preenchido pela RPC no envio (Parte 8) — só existe depois do sucesso.
    clinicaId: null
  };
}

let estado = estadoInicial();

function salvarRascunho() {
  localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado));
}

function carregarRascunho() {
  const bruto = localStorage.getItem(CHAVE_RASCUNHO);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

function limparRascunho() {
  localStorage.removeItem(CHAVE_RASCUNHO);
}
