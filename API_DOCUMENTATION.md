# 📚 Documentação da API - Trend Hunter

## 🚀 Visão Geral

A API do Trend Hunter foi desenvolvida em Node.js com Express e se conecta ao Supabase para fornecer dados de análise de e-commerce. A API está implantada no Vercel e serve como backend para o dashboard de analytics.

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + Express
- **Banco de Dados**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **CORS**: Configurado para permitir requisições do frontend

## 📡 Endpoints Disponíveis

### 1. 📊 Analytics Completo
**Endpoint**: `GET /api/analytics-full`

**Descrição**: Retorna dados completos dos produtos com filtros opcionais.

**Parâmetros Query**:
- `platform` (string): Filtro por plataforma ('mercadolivre', 'amazon', 'all')
- `category` (string): Filtro por categoria ('top10', nome específico, 'all')
- `date_from` (string): Data inicial no formato YYYY-MM-DD
- `date_to` (string): Data final no formato YYYY-MM-DD

**Exemplo de Uso**:
```javascript
// Buscar dados de hoje
const response = await fetch('https://trend-hunter-vert.vercel.app/api/analytics-full?date_from=2026-04-24&date_to=2026-04-24');

// Buscar dados do Mercado Livre
const response = await fetch('https://trend-hunter-vert.vercel.app/api/analytics-full?platform=mercadolivre');

// Buscar top 10 categorias
const response = await fetch('https://trend-hunter-vert.vercel.app/api/analytics-full?category=top10');
```

**Resposta**:
```json
{
  "data": [
    {
      "id": 1,
      "data": "Nome do Produto",
      "platform": "mercadolivre",
      "category": "Eletrônicos",
      "price": 1299.99,
      "scraped_at": "2026-04-24T15:30:00.000Z"
    }
  ],
  "count": 1,
  "total": 1500
}
```

---

### 2. 🔥 Oportunidades de Preço
**Endpoint**: `GET /api/opportunities`

**Descrição**: Retorna produtos com queda de preço significativa.

**Exemplo de Uso**:
```javascript
const response = await fetch('https://trend-hunter-vert.vercel.app/api/opportunities');
```

**Resposta**:
```json
{
  "data": [
    {
      "data": "Produto com Queda",
      "platform": "amazon",
      "price_atual": 899.99,
      "price_anterior": 1299.99,
      "diferenca_percentual": -30.8,
      "url": "https://amazon.com/produto"
    }
  ]
}
```

---

### 3. 📂 Categorias
**Endpoint**: `GET /api/categories`

**Descrição**: Retorna lista de categorias disponíveis.

**Parâmetros Query**:
- `platform` (string): Filtro opcional por plataforma

**Exemplo de Uso**:
```javascript
const response = await fetch('https://trend-hunter-vert.vercel.app/api/categories?platform=mercadolivre');
```

**Resposta**:
```json
{
  "categories": ["Eletrônicos", "Moda", "Casa & Jardim", "Esportes"]
}
```

---

### 4. 📈 Estatísticas
**Endpoint**: `GET /api/stats`

**Descrição**: Retorna estatísticas gerais dos dados.

**Exemplo de Uso**:
```javascript
const response = await fetch('https://trend-hunter-vert.vercel.app/api/stats');
```

**Resposta**:
```json
{
  "total_products": 1500,
  "platforms": ["mercadolivre", "amazon"],
  "categories_count": 25,
  "latest_date": "2026-04-24T15:30:00.000Z"
}
```

---

### 5. 💚 Health Check
**Endpoint**: `GET /health`

**Descrição**: Verifica se a API está funcionando.

**Exemplo de Uso**:
```javascript
const response = await fetch('https://trend-hunter-vert.vercel.app/health');
```

**Resposta**:
```json
{
  "status": "OK",
  "timestamp": "2026-04-24T18:00:00.000Z",
  "version": "1.0.0"
}
```

## ⚠️ Problemas Conhecidos e Soluções

### 🚨 Problema: Filtros de Data Não Retornam Resultados

**Sintoma**: Busca por data retorna 0 resultados mesmo com dados existentes.

**Causas Possíveis**:

1. **Formato de Data Incorreto**
   - **Frontend envia**: `2026-04-24`
   - **Backend converte para**: `2026-04-24T00:00:00.000Z`
   - **Dados na tabela podem ter**: Formato diferente

2. **Fuso Horário**
   - Conversão UTC pode estar desalinhada com os dados
   - Dados podem estar em horário local

3. **Campo Data Incorreto**
   - API usa campo `scraped_at`
   - Dados podem estar em outro campo

**Soluções Implementadas**:

#### ✅ Debug Avançado
```javascript
// Log adicionado para verificar dados reais na tabela
console.log("=== DEBUG: Verificando dados na tabela ===");
const { data: allData } = await supabase
  .from("products_trend")
  .select("scraped_at, platform, data")
  .limit(5);
```

#### ✅ Validação Flexível
```javascript
// Validação corrigida no frontend
const hasValidStructure = data.every(item => 
  item && typeof item === 'object' && 
  (item.data || item.name || item.title)
);
```

### 🔧 Debug e Monitoramento

#### Logs Disponíveis:
- ✅ **Variáveis de ambiente**: Verifica configuração do Supabase
- ✅ **Dados da tabela**: Mostra primeiros registros
- ✅ **Filtros aplicados**: Log de cada filtro
- ✅ **Query SQL**: Query gerada para debug
- ✅ **Resultados**: Quantidade de dados encontrados

#### Como Verificar Logs:
1. Acessar dashboard do Vercel
2. Ir para "Functions" → "Logs"
3. Filtrar por `/api/analytics-full`

### 📋 Checklist de Debug

#### ✅ Verificar no Vercel:
- [ ] Variáveis de ambiente configuradas
- [ ] Logs mostram dados na tabela
- [ ] Formato das datas em `scraped_at`
- [ ] Filtros sendo aplicados corretamente

#### ✅ Verificar no Frontend:
- [ ] Datas sendo convertidas para ISO
- [ ] URL da API está correta
- [ ] Resposta sendo processada
- [ ] Estrutura dos dados válida

## 🔄 Fluxo de Dados

```
Frontend (Dashboard.js)
    ↓
Converte datas dd/MM/yyyy → YYYY-MM-DD
    ↓
GET /api/analytics-full?date_from=2026-04-24&date_to=2026-04-24
    ↓
Backend (Server.js)
    ↓
Valida variáveis de ambiente
    ↓
Converte YYYY-MM-DD → ISO (2026-04-24T00:00:00.000Z)
    ↓
Aplica filtros na tabela products_trend
    ↓
Retorna dados para frontend
    ↓
Frontend processa e exibe gráficos
```

## 🛠️ Configuração de Ambiente

### Variáveis de Ambiente Necessárias:
```bash
SUPABASE_URL=https://htzfxelkqieqjdwqyvx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

### Como Configurar no Vercel:
1. Dashboard → Settings → Environment Variables
2. Adicionar variáveis acima
3. Fazer novo deploy

## 📊 Estrutura da Tabela

### products_trend:
```sql
CREATE TABLE products_trend (
  id SERIAL PRIMARY KEY,
  data TEXT,                    -- Nome do produto
  platform VARCHAR(20),        -- 'mercadolivre' ou 'amazon'
  category VARCHAR(100),        -- Categoria do produto
  price DECIMAL(10,2),         -- Preço atual
  scraped_at TIMESTAMP,         -- Data de coleta
  url TEXT,                     -- URL do produto
  created_at TIMESTAMP DEFAULT NOW()
);
```

### vw_oportunidades_trend:
```sql
CREATE VIEW vw_oportunidades_trend AS
SELECT 
  data,
  platform,
  price_atual,
  price_anterior,
  ((price_atual - price_anterior) / price_anterior * 100) as diferenca_percentual,
  url
FROM products_trend
WHERE price_atual < price_anterior * 0.9; -- Queda > 10%
```

## 🚨 Status Atual

### ✅ Funcionando:
- [x] Conexão com Supabase
- [x] Endpoint `/api/opportunities` (6 resultados)
- [x] Health check
- [x] CORS configurado
- [x] Logs de debug

### ❌ Problemas:
- [ ] Filtros de data retornam 0 resultados
- [ ] Categorias retornam 0 resultados
- [ ] Analytics principal retorna vazio

### 🔍 Investigação em Andamento:
- [ ] Verificar formato real das datas na tabela
- [ ] Confirmar se existem dados para a data filtrada
- [ ] Testar sem filtros de data
- [ ] Verificar estrutura dos dados retornados

## 📞 Suporte

Para problemas:
1. Verificar logs no Vercel
2. Confirmar variáveis de ambiente
3. Testar endpoints diretamente
4. Verificar estrutura dos dados

---

**Última atualização**: 24/04/2026
**Versão**: 1.0.0
**Status**: Em debug de filtros de data
