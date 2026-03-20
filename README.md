# ML Trend Hunter 🚀

**Caçador de Tendências do Mercado Livre** - Sistema automatizado para identificar produtos em alta e oportunidades de negócio.

## 📋 O que Faz

- **Lista Diária por Email**: Envia os produtos mais vendidos do Mercado Livre todos os dias
- **Dashboard Completo**: Acesso a filtros inteligentes e dados em tempo real
- **Trial Gratuito**: 7 dias para testar sem compromisso
- **Plano Único**: R$47/mês após o trial

## 🏗️ Como Funciona

```
Cliente se cadastra → N8N processa → Envia lista diária → Dashboard com dados
```

### Páginas
- **index.html** - Página principal com "Começar Grátis"
- **plano.html** - Detalhes do plano e conversão direta

## 🔄 Automação N8N

### Workflow 1: Cadastro de Usuário
```
Webhook → Validar email → Salvar na planilha → Enviar boas-vindas → Agendar lista
```

**Webhook**: `POST /webhook/cadastro-plano`
```json
{
  "email": "cliente@email.com",
  "plano": "acesso-completo",
  "origem": "pagina-plano" // ou "comecar-gratis"
}
```

### Workflow 2: Lista Diária
```
Cron (9h) → Buscar dados ML → Filtrar produtos → Gerar HTML → Enviar emails
```

**O que busca**: Top 10 produtos mais vendidos com:
- Preço e volume de vendas
- Margem de lucro estimada
- Link direto para o produto
- Crescimento recente

## 🛠️ Tecnologias

- **Frontend**: HTML + Tailwind CSS + JavaScript
- **Backend**: N8N (automação)
- **Hospedagem**: Vercel (grátis)
- **Túnel**: Cloudflare (para N8N local)

## 🚀 Setup Rápido

### 1. Hospedar no Vercel
```bash
# Fazer upload dos arquivos HTML
# Configurar domínio personalizado (opcional)
```

### 2. Configurar N8N Local
```bash
# Instalar N8N
npm install n8n -g

# Iniciar N8N
n8n
```

### 3. Criar Túnel Cloudflare
```bash
# Criar túnel para N8N
cloudflared tunnel --url http://localhost:5678
```

### 4. Configurar Workflows
1. **Webhook de Cadastro**: `/webhook/cadastro-plano`
2. **Cron Diário**: Todos os dias às 9h
3. **Integrações**: Gmail + Google Sheets

## 📊 Fluxo Completo

### Cadastro do Cliente
1. Cliente preenche email no site
2. Dados vão para N8N via webhook
3. N8N salva na planilha e envia email de boas-vindas
4. Cliente começa a receber lista diária

### Lista Diária
1. N8N busca dados do Mercado Livre
2. Filtra os 10 melhores produtos
3. Gera email HTML formatado
4. Envia para todos os assinantes ativos

## � URLs Importantes

- **Site**: `https://seu-site.vercel.app`
- **N8N**: `http://localhost:5678`
- **Túnel**: `https://seu-tunnel.trycloudflare.com`
- **Webhook**: `https://seu-tunnel.trycloudflare.com/webhook/cadastro-plano`

## 📝 Variáveis de Ambiente

```javascript
// No frontend
const N8N_WEBHOOK_URL = 'https://seu-tunnel.trycloudflare.com/webhook/cadastro-plano';

// No N8N
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=sua_senha
```

## 🎯 Próximos Passos

1. **Subir arquivos** para o Vercel
2. **Configurar túnel** Cloudflare
3. **Criar workflows** no N8N
4. **Testar webhook** de cadastro
5. **Configurar cron** diário
6. **Monitorar envios** de email

## 📈 Métricas para Monitorar

- Taxa de conversão do formulário
- Taxa de abertura de emails
- Número de assinantes ativos
- Cancelamentos

---

**Desenvolvido com ❤️ usando N8N + Vercel**
