# 🔄 Esboço da Automação N8N

## Workflow 1: Cadastro de Usuário

### Trigger: Webhook
- **URL**: `POST /webhook/cadastro-plano`
- **Recebe**: Email, plano, origem

### Processo:
1. **Validar email** → Verificar formato
2. **Verificar duplicidade** → Buscar na planilha
3. **Salvar dados** → Adicionar linha no Google Sheets
4. **Enviar email** → Boas-vindas + instruções
5. **Agendar** → Primeira lista em 24h

### Dados Salvos:
- Email
- Plano (acesso-completo)
- Data de cadastro
- Origem (pagina-plano / comecar-gratis)
- Status (trial / ativo)

---

## Workflow 2: Lista Diária de Produtos

### Trigger: Cron
- **Horário**: Todos os dias 9h
- **Frequência**: Diária

### Processo:
1. **Buscar dados** → API Mercado Livre
2. **Filtrar produtos** → Top 10 mais vendidos
3. **Calcular métricas** → Margem, crescimento
4. **Gerar HTML** → Email formatado
5. **Enviar lote** → Todos os assinantes ativos

### O que busca:
- Título do produto
- Preço atual
- Volume de vendas
- Margem estimada
- Link do anúncio
- Imagem do produto

---

## Workflow 3: Confirmação de Pagamento

### Trigger: Webhook
- **URL**: `POST /webhook/pagamento-confirmado`
- **Fonte**: Gateway de pagamento

### Processo:
1. **Receber confirmação** → ID transação
2. **Atualizar status** → "ativo" na planilha
3. **Enviar email** → Bem-vindo ao plano
4. **Remover limitações** → Acesso total

---

## 📊 Estrutura de Dados

### Google Sheets (Assinantes)
| Coluna | Dado |
|--------|------|
| A | Email |
| B | Plano |
| C | Data Cadastro |
| D | Status |
| E | Data Expira Trial |
| F | Origem |

### Email Diário (HTML)
```html
<h1>🚀 ML Trend Hunter - Lista Diária</h1>
<p>Data: 20/03/2026</p>

<div class="produto">
  <h3>#1 Fone de Ouvido Bluetooth</h3>
  <p>Preço: R$ 89,90</p>
  <p>Vendas: 2.847 | Crescimento: +45%</p>
  <p>Margem: 35%</p>
  <a href="#">Ver no ML →</a>
</div>
```

---

## 🔗 Integrações

### Gmail
- **Envio**: Boas-vindas, lista diária
- **Remetente**: noreply@mltrendhunter.com
- **Autenticação**: OAuth2

### Google Sheets
- **Planilha**: Assinantes ML Trend Hunter
- **Permissões**: Leitura/escrita
- **Backup**: Manual semanal

### Mercado Livre API
- **Endpoint**: Search de produtos
- **Filtros**: Mais vendidos, categoria
- **Rate Limit**: 1000 req/hora

---

## 🚨 Tratamento de Erros

### Webhook falha
- **Log**: Erro no console N8N
- **Retry**: 3 tentativas
- **Notificação**: Email para admin

### API ML fora
- **Cache**: Usar dados do dia anterior
- **Fallback**: Lista estática
- **Notificação**: Alerta no dashboard

### Email não enviado
- **Queue**: Tentar novamente em 1h
- **Bounce**: Remover da lista
- **Log**: Motivo do erro

---

## 📈 Monitoramento

### KPIs
- Cadastros/dia
- Taxa de conversão
- Emails enviados
- Taxa de abertura
- Cancelamentos

### Logs
- Webhook requests
- API calls
- Email delivery
- Error tracking

---

## 🔄 Manutenção

### Diária
- Verificar envios de email
- Monitorar performance
- Backup da planilha

### Semanal
- Limpar logs antigos
- Atualizar produtos
- Revisar métricas

### Mensal
- Otimizar workflows
- Atualizar integrações
- Revisar custos
