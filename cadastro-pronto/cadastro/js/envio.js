// Chamada da RPC transacional. Sem estado próprio — monta o payload a
// partir de `estado`, chama `criar_clinica_completa` e devolve o retorno
// ou lança o erro como veio do Supabase (quem chama decide como exibir).

function montarPayloadCadastro() {
  const procedimentosPayload = estado.procedimentos.map(p => ({
    ref: p.ref,
    especialidade: p.especialidade,
    duracao_min: String(p.duracao_min),
    pdf_url: p.pdf_url ?? null,
    pdf_url_geral: estado.pdfGeral ?? null,
  }));

  return {
    clinica: {
      nome: estado.clinica.nome,
      telefone: normalizarTelefone(estado.clinica.telefone),
      email_admin: estado.clinica.email_admin,
      endereco: estado.clinica.endereco,
      horario_abertura: estado.clinica.horario_abertura,
      horario_fechamento: estado.clinica.horario_fechamento,
    },
    procedimentos: procedimentosPayload,
    profissionais: estado.profissionais.map(p => ({
      nome: p.nome,
      intervalo_min: p.intervalo_min,
      procedimentos: p.procedimentos,
      horarios: p.horarios,
    })),
  };
}

async function enviarCadastro() {
  const { data, error } = await db.rpc('criar_clinica_completa', {
    payload: montarPayloadCadastro(),
  });

  if (error) throw error;
  return data;
}

// Códigos vindos de erro de configuração (grant/assinatura da função) não
// dizem nada útil pra quem preenche o formulário — a mensagem da RPC em si
// (branch "outros") já foi escrita em português legível para os demais casos.
function mensagemErroEnvio(erro) {
  switch (erro.code) {
    case '42501':
    case 'PGRST202':
      return 'Erro de configuração do sistema. Avise a equipe OptiAgente.';
    case '23505':
      return 'Este cadastro já existe.';
    default:
      return erro.message || 'Não foi possível concluir o cadastro. Tente novamente.';
  }
}
