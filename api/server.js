const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração Supabase - com variáveis de ambiente e fallback
const supabaseUrl =
  process.env.SUPABASE_URL || "https://htzfxelkqieqjdwqyvx.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0emZ4ZWxxaWVxamR3cXl2eCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ0NTkyOTY2LCJleHAiOjIwNjAyMjg5NjZ9.H2q6w_8K7y8pXoRfLpXhNqy5S8A9n5y7w3y2k8m4";

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para executar SQL customizado - Simplificado via REST API
app.post("/api/sql", async (req, res) => {
  try {
    const { query } = req.body;

    console.log("Recebendo query SQL:", query);

    // Validação básica de segurança
    const forbiddenKeywords = [
      "DROP",
      "DELETE",
      "UPDATE",
      "INSERT",
      "CREATE",
      "ALTER",
      "TRUNCATE",
    ];

    const upperQuery = query.toUpperCase();
    for (const keyword of forbiddenKeywords) {
      if (upperQuery.includes(keyword)) {
        return res.status(403).json({
          error: "Operação não permitida",
          message: "Apenas consultas SELECT são permitidas",
        });
      }
    }

    // Para queries simples COUNT, usar REST API
    if (upperQuery.includes("COUNT(*)")) {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/products_trend?select=count`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "count=exact",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const countHeader = response.headers.get("content-range") || "0-0/0";
        const total = countHeader.split("/")[1] || "0";

        res.json({ data: [{ total: parseInt(total) }] });
        return;
      } catch (error) {
        console.error("Erro COUNT:", error);
        // Fallback para busca completa
      }
    }

    // Para queries SELECT com WHERE, tentar parse simples
    if (upperQuery.includes("SELECT") && upperQuery.includes("FROM")) {
      try {
        let restQuery = "select=*";

        // Parse simples de WHERE conditions
        if (upperQuery.includes("WHERE")) {
          const whereMatch = query.match(
            /WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i,
          );
          if (whereMatch) {
            const whereClause = whereMatch[1].trim();

            // Parse de conditions simples
            const conditions = whereClause.split(/\s+AND\s+/i);
            conditions.forEach((condition) => {
              const match = condition.match(
                /(\w+)\s*(=|>=|<=|>|<)\s*['"]?([^'"]+)['"]?/i,
              );
              if (match) {
                const [, field, operator, value] = match;
                let restOperator = "eq";

                if (operator === ">=") restOperator = "gte";
                else if (operator === "<=") restOperator = "lte";
                else if (operator === ">") restOperator = "gt";
                else if (operator === "<") restOperator = "lt";

                restQuery += `&${field}=${restOperator}.${encodeURIComponent(value)}`;
              }
            });
          }
        }

        // Parse LIMIT
        const limitMatch = query.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
          restQuery += `&limit=${limitMatch[1]}`;
        } else {
          restQuery += "&limit=100";
        }

        console.log("Query REST gerada:", restQuery);

        const response = await fetch(
          `${supabaseUrl}/rest/v1/products_trend?${restQuery}`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        res.json({ data });
        return;
      } catch (error) {
        console.error("Erro parse SQL:", error);
      }
    }

    // Fallback: retornar dados básicos
    const fallbackResponse = await fetch(
      `${supabaseUrl}/rest/v1/products_trend?select=*&limit=10`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },
      },
    );

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      res.json({
        data,
        warning: "Query complexa não suportada. Retornando dados básicos.",
      });
    } else {
      throw new Error("Falha ao executar query");
    }
  } catch (error) {
    console.error("Erro SQL:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message,
    });
  }
});

// Endpoint para dados agregados - Simplificado via REST API
app.get("/api/analytics", async (req, res) => {
  try {
    const { platform, category, date_from, date_to, limit = 100 } = req.query;

    console.log("Buscando analytics com filtros:", {
      platform,
      category,
      date_from,
      date_to,
      limit,
    });

    // Construir query REST API
    let restQuery = `select=*`;
    let orderBy = `order=data.desc,ranking.asc`;

    if (platform) {
      restQuery += `&platform=eq.${encodeURIComponent(platform)}`;
    }

    if (category) {
      restQuery += `&category=eq.${encodeURIComponent(category)}`;
    }

    if (date_from) {
      restQuery += `&data=gte.${encodeURIComponent(date_from)}`;
    }

    if (date_to) {
      restQuery += `&data=lte.${encodeURIComponent(date_to)}`;
    }

    restQuery += `&limit=${limit}&${orderBy}`;

    console.log("Query REST:", restQuery);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/products_trend?${restQuery}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Analytics: ${data.length} produtos encontrados`);

    res.json({ data });
  } catch (error) {
    console.error("Erro Analytics:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para estatísticas - Simplificado via REST API
app.get("/api/stats", async (req, res) => {
  try {
    console.log("Buscando estatísticas...");

    // Buscar dados básicos via REST API
    const response = await fetch(
      `${supabaseUrl}/rest/v1/products_trend?select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Encontrados ${data.length} produtos`);

    // Calcular estatísticas localmente
    const platforms = [...new Set(data.map((item) => item.platform))];
    const categories = [...new Set(data.map((item) => item.category))];
    const avgPrice =
      data.reduce((sum, item) => sum + parseFloat(item.price_current || 0), 0) /
      data.length;

    // Distribuição por platform
    const platformDist = {};
    data.forEach((item) => {
      platformDist[item.platform] = (platformDist[item.platform] || 0) + 1;
    });

    // Top categorias
    const categoryCounts = {};
    data.forEach((item) => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    res.json({
      total_products: [{ count: data.length }],
      avg_price: [{ avg: avgPrice }],
      platforms: platforms.map((p) => ({ platform: p })),
      categories: categories.map((c) => ({ category: c })),
      top_categories: topCategories,
      platform_distribution: Object.entries(platformDist).map(
        ([platform, count]) => ({ platform, count }),
      ),
      price_trends: data.slice(0, 10).map((item) => ({
        data: item.data,
        avg_price: parseFloat(item.price_current || 0),
        platform: item.platform,
      })),
    });
  } catch (error) {
    console.error("Erro Stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para categorias dinâmicas - Simplificado via REST API
app.get("/api/categories", async (req, res) => {
  try {
    const { platform } = req.query;

    console.log("Buscando categorias com filtro:", platform);

    // Construir query REST API para categorias distintas
    let restQuery = "select=category";

    if (platform) {
      restQuery += `&platform=eq.${encodeURIComponent(platform)}`;
    }

    // Buscar categorias via Supabase
    const { data, error } = await supabase
      .from("products_trend")
      .select("category")
      .not("category", "is", null);

    if (error) {
      console.error("Erro ao buscar categorias:", error);
      return res.status(500).json({ error: error.message });
    }

    // Extrair categorias únicas
    const categories = [...new Set(data.map((item) => item.category))];

    console.log("Categorias encontradas:", categories.length);

    res.json({ categories });
  } catch (error) {
    console.error("Erro interno:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obter oportunidades de preço
app.get("/api/opportunities", async (req, res) => {
  try {
    console.log("Buscando oportunidades de preço...");

    const { data, error } = await supabase
      .from("vw_oportunidades_trend")
      .select("*")
      .order("porcentagem_queda", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erro ao buscar oportunidades:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Oportunidades encontradas:", data?.length || 0);

    res.json({
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Erro interno ao buscar oportunidades:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para dados completos sem limitação (para gráficos)
app.get("/api/analytics-full", async (req, res) => {
  try {
    const { platform, category, date_from, date_to } = req.query;

    console.log("Buscando analytics completos com filtros:", {
      platform,
      category,
      date_from,
      date_to,
    });

    // Usar SDK do Supabase com coluna scraped_at (formato ISO)
    let query = supabase
      .from("products_trend")
      .select("*", { count: "exact" })
      .order("scraped_at", { ascending: false })
      .order("ranking", { ascending: true });

    // Aplicar filtros se existirem
    if (platform) {
      query = query.eq("platform", platform);
    }

    if (category) {
      query = query.eq("category", category);
    }

    // Filtros de data usando scraped_at (formato ISO)
    if (date_from) {
      // date_from já vem em formato ISO do frontend (YYYY-MM-DD)
      // Verificar se tem formato válido antes de processar
      if (date_from.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const isoDateFrom = `${date_from}T00:00:00.000Z`;
        query = query.gte("scraped_at", isoDateFrom);
        console.log(`Filtro scraped_at >= ${isoDateFrom}`);
      } else {
        console.log(`Formato date_from inválido: ${date_from}`);
      }
    }

    if (date_to) {
      // date_to já vem em formato ISO do frontend (YYYY-MM-DD)
      // Verificar se tem formato válido antes de processar
      if (date_to.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const isoDateTo = `${date_to}T23:59:59.999Z`;
        query = query.lte("scraped_at", isoDateTo);
        console.log(`Filtro scraped_at <= ${isoDateTo}`);
      } else {
        console.log(`Formato date_to inválido: ${date_to}`);
      }
    }

    console.log("Executando query com SDK do Supabase...");

    const { data, error, count } = await query;

    if (error) {
      console.error("Erro ao buscar analytics completos:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Dados completos carregados:", data?.length || 0, "produtos");

    // Debug: mostrar algumas datas dos resultados
    if (data && data.length > 0) {
      console.log("Primeiras 3 datas encontradas:");
      data.slice(0, 3).forEach((item) => {
        console.log(`  - ${item.scraped_at} (${item.platform}) - ${item.data}`);
      });
    } else {
      console.log("Nenhum dado encontrado com os filtros aplicados");
    }

    res.json({
      data: data || [],
      count: data?.length || 0,
      total: count || 0,
    });
  } catch (error) {
    console.error("Erro interno ao buscar analytics completos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Servir arquivos estáticos
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`🚀 Trend Hunter API rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 API Docs: http://localhost:${PORT}/api`);
});
