// Mecânica de envio ao Supabase Storage. Sem estado próprio — recebe um
// File, devolve a URL pública ou lança erro. Quem chama decide o que fazer
// com o resultado (ver ligarEventosProcedimentos em etapas.js).

const REGEX_MARCAS_DIACRITICAS = /[̀-ͯ]/g;

function normalizarNomeArquivo(nome) {
  return (nome || 'arquivo.pdf')
    .normalize('NFD').replace(REGEX_MARCAS_DIACRITICAS, '')
    .replace(/[^a-zA-Z0-9.-]/g, '-');
}

async function subirPdf(arquivo) {
  const nome = normalizarNomeArquivo(arquivo.name);
  const caminho = `procedimentos/${estado.uuidSessao}/${Date.now()}-${nome}`;

  const { error } = await db.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: 'application/pdf' });

  // getPublicUrl é síncrono e nunca falha sozinho — só chamar depois de
  // confirmar que o upload deu certo, senão a URL parece válida mas 400.
  if (error) throw error;

  const { data } = db.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}
