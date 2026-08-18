// Regras e máscaras reaproveitadas por todas as etapas. Funções puras
// (mascarar/normalizar/validar) não tocam o DOM; os três helpers no fim
// tocam o DOM só para exibir/limpar erro, sempre abaixo do campo específico.

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/;

function apenasDigitos(valor) {
  return (valor || '').replace(/\D/g, '');
}

// Recebe dígitos de DDD+número (sem DDI) e devolve a máscara visual,
// alternando fixo (4+4) e celular (5+4) conforme a quantidade digitada.
function mascararTelefone(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Grava em E.164 sem "+": DDI 55 + DDD + número.
function normalizarTelefone(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  return d ? '55' + d : '';
}

function validarEmail(valor) {
  return REGEX_EMAIL.test((valor || '').trim());
}

// 10 ou 11 dígitos de DDD+número viram 12 ou 13 dígitos normalizados —
// é essa contagem final que a RPC exige.
function validarTelefone(valor) {
  return /^[0-9]{12,13}$/.test(normalizarTelefone(valor));
}

function marcarCampoInvalido(idCampo) {
  document.getElementById(idCampo)?.classList.add('campo--invalido');
}

function limparCampoInvalido(idCampo) {
  document.getElementById(idCampo)?.classList.remove('campo--invalido');
}

function rolarAteCampo(idCampo) {
  document.getElementById(idCampo)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
