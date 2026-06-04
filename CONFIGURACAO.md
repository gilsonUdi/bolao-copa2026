# Bolão Copa 2026 - Guia de Configuração

## 1. Firebase

1. Acesse https://console.firebase.google.com
2. Crie um novo projeto (ex: `bolao-copa2026`)
3. Vá em **Firestore Database** → Criar banco de dados → modo produção
4. Vá em **Configurações do Projeto** → "Seus aplicativos" → adicione um app Web
5. Copie as credenciais para o `.env.local`

**Regras do Firestore** (cole em Firestore → Regras):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Temporário — adicione auth em produção
    }
  }
}
```

## 2. Asaas

1. Acesse https://www.asaas.com e crie uma conta
2. Vá em **Configurações → Integrações → API**
3. Copie sua chave de API para `ASAAS_API_KEY`
4. Para testes: use `https://sandbox.asaas.com/api/v3` como `ASAAS_BASE_URL`
5. Para produção: use `https://api.asaas.com/v3`

## 3. Football Data API (Calendário da Copa)

1. Acesse https://www.football-data.org/
2. Clique em **"Get Free API Key"** e registre-se
3. Copie a chave para `FOOTBALL_API_KEY`
4. Plano gratuito: até 10 req/min — mais que suficiente

> **Nota:** Sem a API key, o sistema usa um calendário estático dos jogos conhecidos da fase de grupos.

## 4. Variáveis de Ambiente

Edite o arquivo `.env.local` com suas credenciais.

## 5. Rodando o Projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## 6. Deploy (Vercel)

```bash
npm install -g vercel
vercel
```

Configure as variáveis de ambiente no painel da Vercel.

## Estrutura das Taxas

- Valor arrecadado: R$ N × (valor por pessoa)
- Prêmio (90%): vai para o vencedor do bolão
- Taxa (10%): sua receita como proprietário da plataforma
- A taxa do Asaas (processamento PIX ~1%) é absorvida dentro dos 10%

> **O usuário vê apenas o prêmio líquido** — a taxa nunca é exibida.

## Pontuação

| Resultado | Pontos |
|-----------|--------|
| Placar exato | 10 pts |
| Vencedor + um placar correto | 7 pts |
| Somente vencedor/empate correto | 5 pts |
| Errou | 0 pts |
