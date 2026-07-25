# OptiAgente — Site institucional

Site estático (HTML/CSS/JS puro, sem build step) do OptiAgente: assistente de
agendamento com IA que integra o Google Calendar da clínica ao atendimento
via WhatsApp.

## Estrutura do projeto

```
.
├── index.html            # Landing page principal
├── privacidade.html      # Política de Privacidade e Proteção de Dados
├── termos.html           # Termos de Serviço e Uso do Software
├── conectar-agenda.html  # Fluxo de conexão OAuth com o Google Calendar
├── 404.html              # Página de erro 404 personalizada
├── style.css             # Design system compartilhado (preto e branco)
├── logo.png              # Logotipo OptiAgente (usado como favicon e og:image)
├── robots.txt             # Diretivas para crawlers
├── sitemap.xml             # Mapa do site para SEO
├── CNAME                  # Domínio customizado do GitHub Pages
└── .github/workflows/pages.yml  # Deploy automático para o GitHub Pages
```

Não há dependências, gerenciador de pacotes ou etapa de build: é HTML, CSS e
um pouco de JavaScript vanilla, prontos para servir estaticamente.

## Rodando localmente

Basta abrir `index.html` diretamente no navegador, ou subir um servidor
estático simples na raiz do projeto, por exemplo:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Publicando no GitHub Pages

1. Crie o repositório no GitHub e envie estes arquivos para a branch `main`.
2. Em **Settings → Pages**, selecione a fonte **GitHub Actions** (o workflow
   em `.github/workflows/pages.yml` já está configurado para publicar a cada
   push na `main`) — ou, alternativamente, selecione **Deploy from a branch**
   apontando para `main` / pasta raiz, já que o site não precisa de build.
3. Se for usar o domínio próprio `optiagente.com.br`, mantenha o arquivo
   `CNAME` na raiz e configure no seu provedor de DNS um registro `A`
   apontando para os IPs do GitHub Pages (ou `CNAME` para
   `SEU_USUARIO.github.io`, conforme a
   [documentação oficial](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
   Caso não vá usar esse domínio ainda, apague o arquivo `CNAME` para evitar
   que o Pages tente redirecionar para um domínio não configurado.

## Antes de publicar, confira

- **Domínio nas meta tags**: `og:image`, `og:url` e `canonical` em
  `index.html`, `privacidade.html` e `termos.html` apontam para
  `https://optiagente.com.br/...`. Ajuste se o domínio final for outro.
- **Número de WhatsApp**: os botões de CTA usam `https://wa.me/556294845992`.
  Números de celular brasileiros normalmente têm 9 dígitos após o DDD —
  confirme se não falta o primeiro `9` antes de publicar.
- **`client_id` e `redirect_uri`** em `conectar-agenda.html`: são específicos
  do projeto Google Cloud / Supabase do OptiAgente. Não versione chaves
  privadas (client secret) neste repositório — apenas o `client_id`, que é
  público, está presente aqui.

## Contato

Suporte: contato@optiagente.com.br

## Licença

Todos os direitos reservados. Este código é proprietário do OptiAgente e não
está licenciado para redistribuição ou reuso — veja `LICENSE`.
