// URL base do projeto — SEM /rest/v1/ no final.
// O SDK monta os caminhos sozinho; incluir o path gera 404.
const SUPABASE_URL  = 'https://ajbjlbiszqpeocitrwlj.supabase.co';

// Chave anon (pública por design — ver seção 11).
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYmpsYmlzenFwZW9jaXRyd2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjEwMDUsImV4cCI6MjA5ODQ5NzAwNX0.cJ0n35MNHDGi_ozett0HyCcUZB73zpOjbYUSNVHHGc8';

const BUCKET          = 'orientacoes';
const URL_PRIVACIDADE = 'https://optiagente.com.br/privacidade.html';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
