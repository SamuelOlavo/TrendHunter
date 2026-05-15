const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const ws = require("ws");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Configuração Supabase - usar variáveis de ambiente com fallback
const supabaseUrl =
  process.env.SUPABASE_URL || "https://nnejmusqyekdczfphyvn.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uZWptdXNxeWVrZGN6ZnBoeXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDc5NDUsImV4cCI6MjA5MTE4Mzk0NX0.lTzzisBPD7RgGHx-xdo8fdo8Y5p1GKEHlHFu6-cE7L0";

// Validar variáveis de ambiente essenciais
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO: Variáveis de ambiente do Supabase não configuradas!");
  console.error(
    "SUPABASE_URL:",
    supabaseUrl ? "✅ Configurada" : "❌ NÃO CONFIGURADA",
  );
  console.error(
    "SUPABASE_ANON_KEY:",
    supabaseKey ? "✅ Configurada" : "❌ NÃO CONFIGURADA",
  );
  console.error("Configure as variáveis no dashboard do Vercel:");
  console.error("1. Vá para Settings → Environment Variables");
  console.error("2. Adicione SUPABASE_URL e SUPABASE_ANON_KEY");
  console.error("3. Faça um novo deploy");
  process.exit(1);
}

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: "public" },
    global: {
      headers: { "X-Client-Info": "trend-hunter" },
    },
    // Correção aqui: passar o transport ws para o Realtime
    realtime: {
      transport: ws,
    },
  });
} catch (error) {
  console.error(
    "⚠️  AVISO: Não foi possível conectar ao Supabase. O servidor iniciará sem funcionalidades de banco de dados.",
  );
  console.error("Erro:", error.message);
  supabase = null;
}

// Função para executar SQL customizado - Simplificado via REST API
app.post("/api/sql", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

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
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

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
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

    console.log("Buscando estatísticas...");

    let allData = [];

    // Buscar dados de products_trend (Amazon, Mercado Livre, etc.)
    const { data: productsData, error: productsError } = await supabase
      .from("products_trend")
      .select("*");

    if (productsError) {
      console.error("Erro ao buscar products_trend:", productsError);
    } else {
      console.log(
        `Encontrados ${productsData.length} produtos em products_trend`,
      );
      allData = allData.concat(productsData);
    }

    // Buscar dados da Shopee
    const { data: shopeeData, error: shopeeError } = await supabase
      .from("shopee_trend")
      .select("*");

    if (shopeeError) {
      console.error("Erro ao buscar shopee_trend:", shopeeError);
    } else {
      console.log(`Encontrados ${shopeeData.length} produtos na Shopee`);
      // Converter dados da Shopee para formato compatível
      const shopeeFormatted = shopeeData.map((item) => ({
        id: item.id,
        platform: "Shopee",
        name: item.name,
        category: item.category,
        ranking: (item.sales || 0) * (item.rating_star || 0),
        price_current: item.price,
        image_url: item.image_url,
        url: item.url_product,
        scraped_at: item.scraped_at,
        data: item.data,
        sales: item.sales,
        rating_star: item.rating_star,
        commission: item.commission,
      }));
      allData = allData.concat(shopeeFormatted);
    }

    console.log(`Total de produtos: ${allData.length}`);

    // Calcular estatísticas localmente
    const platforms = [...new Set(allData.map((item) => item.platform))];
    const categories = [...new Set(allData.map((item) => item.category))];
    const avgPrice =
      allData.reduce(
        (sum, item) => sum + parseFloat(item.price_current || 0),
        0,
      ) / allData.length;

    // Distribuição por platform
    const platformDist = {};
    allData.forEach((item) => {
      platformDist[item.platform] = (platformDist[item.platform] || 0) + 1;
    });

    // Top categorias
    const categoryCounts = {};
    allData.forEach((item) => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    // Estatísticas específicas da Shopee
    const shopeeStats = shopeeData
      ? {
          total_products: shopeeData.length,
          avg_rating:
            shopeeData.reduce((sum, item) => sum + (item.rating_star || 0), 0) /
            shopeeData.length,
          total_sales: shopeeData.reduce(
            (sum, item) => sum + (item.sales || 0),
            0,
          ),
          avg_commission:
            shopeeData.reduce((sum, item) => sum + (item.commission || 0), 0) /
            shopeeData.length,
        }
      : null;

    res.json({
      total_products: [{ count: allData.length }],
      avg_price: [{ avg: avgPrice }],
      platforms: platforms.map((p) => ({ platform: p })),
      categories: categories.map((c) => ({ category: c })),
      top_categories: topCategories,
      platform_distribution: Object.entries(platformDist).map(
        ([platform, count]) => ({ platform, count }),
      ),
      price_trends: allData.slice(0, 10).map((item) => ({
        data: item.data,
        avg_price: parseFloat(item.price_current || 0),
        platform: item.platform,
      })),
      shopee_stats: shopeeStats,
    });
  } catch (error) {
    console.error("Erro Stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para categorias dinâmicas - Simplificado via REST API
app.get("/api/categories", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

    const { platform } = req.query;

    console.log("Buscando categorias com filtro:", platform);

    let allCategories = [];

    if (!platform || platform === "all") {
      // Buscar categorias de products_trend
      const { data: productsData, error: productsError } = await supabase
        .from("products_trend")
        .select("category")
        .not("category", "is", null);

      if (productsError) {
        console.error(
          "Erro ao buscar categorias de products_trend:",
          productsError,
        );
      } else {
        allCategories = allCategories.concat(
          productsData.map((item) => item.category),
        );
      }

      // Buscar categorias da Shopee
      const { data: shopeeData, error: shopeeError } = await supabase
        .from("shopee_trend")
        .select("category")
        .not("category", "is", null);

      if (shopeeError) {
        console.error("Erro ao buscar categorias da Shopee:", shopeeError);
      } else {
        allCategories = allCategories.concat(
          shopeeData.map((item) => item.category),
        );
      }
    } else if (platform === "Shopee") {
      // Buscar apenas categorias da Shopee
      const { data, error } = await supabase
        .from("shopee_trend")
        .select("category")
        .not("category", "is", null);

      if (error) {
        console.error("Erro ao buscar categorias da Shopee:", error);
        return res.status(500).json({ error: error.message });
      }

      allCategories = data.map((item) => item.category);
    } else {
      // Buscar categorias de uma plataforma específica
      const { data, error } = await supabase
        .from("products_trend")
        .select("category")
        .eq("platform", platform)
        .not("category", "is", null);

      if (error) {
        console.error("Erro ao buscar categorias:", error);
        return res.status(500).json({ error: error.message });
      }

      allCategories = data.map((item) => item.category);
    }

    // Extrair categorias únicas e contar produtos
    const categoryCounts = {};
    allCategories.forEach((category) => {
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, product_count: count }))
      .sort((a, b) => b.product_count - a.product_count);

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
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

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

// Endpoint específico para dados da Shopee
app.get("/api/shopee", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

    console.log("=== INÍCIO /api/shopee ===");

    const { category, limit = 50, min_sales = 10 } = req.query;

    console.log("Buscando dados da Shopee com filtros:", {
      category,
      limit,
      min_sales,
    });

    let query = supabase
      .from("shopee_trend")
      .select("*")
      .gte("sales", min_sales);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    query = query.order("sales", { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar dados da Shopee:", error);
      return res.status(500).json({ error: error.message });
    }

    // Calcular score de ranking (sales * rating_star)
    const shopeeData = data
      .map((item) => ({
        ...item,
        ranking_score: (item.sales || 0) * (item.rating_star || 0),
        platform: "Shopee",
      }))
      .sort((a, b) => b.ranking_score - a.ranking_score);

    console.log("Dados da Shopee encontrados:", shopeeData.length);

    res.json({
      data: shopeeData,
      count: shopeeData.length,
      message: "Dados da Shopee com ranking baseado em sales × rating_star",
    });
  } catch (error) {
    console.error("Erro interno ao buscar dados da Shopee:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para analytics da Shopee
app.get("/api/shopee-analytics", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

    console.log("Buscando analytics da Shopee...");

    const { category, date_from, date_to } = req.query;

    let query = supabase.from("shopee_trend").select("*");

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (date_from) {
      query = query.gte("scraped_at", `${date_from}T00:00:00.000Z`);
    }

    if (date_to) {
      query = query.lte("scraped_at", `${date_to}T23:59:59.999Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar analytics da Shopee:", error);
      return res.status(500).json({ error: error.message });
    }

    // Calcular estatísticas específicas da Shopee
    const totalProducts = data.length;
    const avgRating =
      data.reduce((sum, item) => sum + (item.rating_star || 0), 0) /
      totalProducts;
    const totalSales = data.reduce((sum, item) => sum + (item.sales || 0), 0);
    const avgPrice =
      data.reduce((sum, item) => sum + (item.price || 0), 0) / totalProducts;

    // Top categorias por vendas
    const categorySales = {};
    data.forEach((item) => {
      if (item.category) {
        categorySales[item.category] =
          (categorySales[item.category] || 0) + (item.sales || 0);
      }
    });

    const topCategoriesBySales = Object.entries(categorySales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, sales]) => ({ category, total_sales: sales }));

    // Top produtos por score
    const topProducts = data
      .map((item) => ({
        ...item,
        ranking_score: (item.sales || 0) * (item.rating_star || 0),
      }))
      .sort((a, b) => b.ranking_score - a.ranking_score)
      .slice(0, 20);

    res.json({
      data: data,
      stats: {
        total_products: totalProducts,
        avg_rating: avgRating.toFixed(2),
        total_sales: totalSales,
        avg_price: avgPrice.toFixed(2),
        top_categories_by_sales: topCategoriesBySales,
      },
      top_products: topProducts,
    });
  } catch (error) {
    console.error("Erro interno no analytics da Shopee:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para categorias da Shopee
app.get("/api/shopee-categories", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

    console.log("Buscando categorias da Shopee...");

    const { data, error } = await supabase
      .from("shopee_trend")
      .select("category")
      .not("category", "is", null);

    if (error) {
      console.error("Erro ao buscar categorias da Shopee:", error);
      return res.status(500).json({ error: error.message });
    }

    // Extrair categorias únicas e contar produtos
    const categoryCounts = {};
    data.forEach((item) => {
      if (item.category) {
        categoryCounts[item.category] =
          (categoryCounts[item.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, product_count: count }))
      .sort((a, b) => b.product_count - a.product_count);

    console.log("Categorias da Shopee encontradas:", categories.length);

    res.json({ categories });
  } catch (error) {
    console.error("Erro interno ao buscar categorias da Shopee:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para analytics completo - usando SDK do Supabase
app.get("/api/analytics-full", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

    console.log("=== INÍCIO /api/analytics-full ===");

    const { platform, category, date_from, date_to } = req.query;

    console.log("Buscando analytics completos com filtros:", {
      platform,
      category,
      date_from,
      date_to,
    });

    // Verificar variáveis de ambiente
    console.log("Variáveis de ambiente:");
    console.log(
      "SUPABASE_URL:",
      process.env.SUPABASE_URL ? "Configurada" : "NÃO CONFIGURADA",
    );
    console.log(
      "SUPABASE_ANON_KEY:",
      process.env.SUPABASE_ANON_KEY ? "Configurada" : "NÃO CONFIGURADA",
    );

    let allData = [];

    // Se platform for "all" ou não especificado, buscar dados de todas as plataformas
    if (!platform || platform === "all") {
      console.log("Buscando dados de todas as plataformas...");

      // Buscar dados da products_trend (Amazon, Mercado Livre, etc.)
      const { data: productsData, error: productsError } = await supabase
        .from("products_trend")
        .select("*");

      if (productsError) {
        console.error("Erro ao buscar products_trend:", productsError);
      } else {
        console.log(
          `Encontrados ${productsData.length} produtos em products_trend`,
        );
        allData = allData.concat(productsData);
      }

      // Buscar dados da Shopee
      const { data: shopeeData, error: shopeeError } = await supabase
        .from("shopee_trend")
        .select("*");

      if (shopeeError) {
        console.error("Erro ao buscar shopee_trend:", shopeeError);
      } else {
        console.log(`Encontrados ${shopeeData.length} produtos na Shopee`);
        // Converter dados da Shopee para formato compatível
        const shopeeFormatted = shopeeData.map((item) => ({
          id: item.id,
          platform: "Shopee",
          name: item.name,
          category: item.category,
          ranking: (item.sales || 0) * (item.rating_star || 0), // Usar ranking_score como ranking
          price_current: item.price,
          image_url: item.image_url,
          url: item.url_product,
          scraped_at: item.scraped_at,
          data: item.data,
          sales: item.sales,
          rating_star: item.rating_star,
          commission: item.commission,
          ranking_score: (item.sales || 0) * (item.rating_star || 0),
        }));
        allData = allData.concat(shopeeFormatted);
      }
    } else if (platform === "Shopee") {
      // Buscar apenas dados da Shopee
      const { data: shopeeData, error: shopeeError } = await supabase
        .from("shopee_trend")
        .select("*");

      if (shopeeError) {
        console.error("Erro ao buscar shopee_trend:", shopeeError);
        return res.status(500).json({ error: shopeeError.message });
      }

      const shopeeFormatted = shopeeData.map((item) => ({
        id: item.id,
        platform: "Shopee",
        name: item.name,
        category: item.category,
        ranking: (item.sales || 0) * (item.rating_star || 0),
        price_current: item.price,
        image_url: item.image_url,
        url: item.url_product,
        scraped_at: item.scraped_at,
        data: item.data,
        sales: item.sales,
        rating_star: item.rating_star,
        commission: item.commission,
        ranking_score: (item.sales || 0) * (item.rating_star || 0),
      }));

      allData = shopeeFormatted;
    } else {
      // Buscar apenas de uma plataforma específica (Amazon, Mercado Livre, etc.)
      let query = supabase.from("products_trend").select("*");
      query = query.eq("platform", platform);

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar dados da plataforma:", error);
        return res.status(500).json({ error: error.message });
      }

      allData = data;
    }

    // Aplicar filtros de categoria
    if (category && category !== "all") {
      if (category === "top10") {
        // Buscar top 10 categorias
        const categoryCounts = {};
        allData.forEach((item) => {
          if (item.category) {
            categoryCounts[item.category] =
              (categoryCounts[item.category] || 0) + 1;
          }
        });

        const topCategories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([cat]) => cat);

        allData = allData.filter((item) =>
          topCategories.includes(item.category),
        );
        console.log("Top10 categorias aplicadas:", topCategories);
      } else {
        allData = allData.filter((item) => item.category === category);
        console.log(`Filtro category aplicado: ${category}`);
      }
    }

    // Aplicar filtros de data
    if (date_from) {
      const startTimestamp = date_from.includes("T")
        ? date_from
        : `${date_from}T00:00:00.000Z`;
      allData = allData.filter((item) => item.scraped_at >= startTimestamp);
    }

    if (date_to) {
      const endTimestamp = date_to.includes("T")
        ? date_to
        : `${date_to}T23:59:59.999Z`;
      allData = allData.filter((item) => item.scraped_at <= endTimestamp);
    }

    console.log("Dados finais após filtros:", allData.length, "produtos");

    // Debug: mostrar algumas datas dos resultados
    if (allData && allData.length > 0) {
      console.log("Primeiras 3 datas encontradas:");
      allData.slice(0, 3).forEach((item) => {
        console.log(`  - ${item.scraped_at} (${item.platform}) - ${item.data}`);
      });
    } else {
      console.log("Nenhum dado encontrado com os filtros aplicados");
    }

    const response = {
      data: allData,
      count: allData.length,
      total: allData.length,
    };

    console.log("Resposta enviada:", response);
    console.log("=== FIM /api/analytics-full ===");

    res.json(response);
  } catch (error) {
    console.error("Erro interno ao buscar analytics completos:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
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

// Test permissions endpoint
app.get("/api/test-permissions", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: "Serviço de banco de dados não disponível",
        message: "Supabase não está conectado",
      });
    }

    console.log("=== TESTE DE PERMISSÕES ===");

    // Testar acesso à tabela products_trend
    console.log("1. Testando SELECT básico em products_trend...");
    const { data: basicData, error: basicError } = await supabase
      .from("products_trend")
      .select("*", { count: "exact", head: true });

    if (basicError) {
      console.error("Erro no SELECT básico:", basicError);
      return res.status(500).json({
        error: "Erro no SELECT básico",
        details: basicError,
        message: "Sem permissão para ler a tabela products_trend",
      });
    }

    console.log("✅ SELECT básico funcionou:", basicData);

    // Testar acesso à view vw_oportunidades_trend
    console.log("2. Testando SELECT em vw_oportunidades_trend...");
    const { data: viewData, error: viewError } = await supabase
      .from("vw_oportunidades_trend")
      .select("*", { count: "exact", head: true });

    if (viewError) {
      console.error("Erro na view:", viewError);
      return res.status(500).json({
        error: "Erro na view",
        details: viewError,
        message: "Sem permissão para ler a view vw_oportunidades_trend",
      });
    }

    console.log("✅ SELECT na view funcionou:", viewData);

    // Testar com dados reais
    console.log("3. Testando busca de dados reais...");
    const { data: realData, error: realError } = await supabase
      .from("products_trend")
      .select("id, data, platform, scraped_at")
      .limit(3);

    // Teste adicional: verificar se tabela existe com estrutura correta
    console.log("4. Verificando estrutura da tabela...");
    const { data: structureData, error: structureError } = await supabase
      .from("products_trend")
      .select("*")
      .limit(1);

    if (realError) {
      console.error("Erro nos dados reais:", realError);
      return res.status(500).json({
        error: "Erro nos dados reais",
        details: realError,
      });
    }

    console.log("✅ Dados reais:", realData);

    if (structureError) {
      console.error("Erro na estrutura:", structureError);
      return res.status(500).json({
        error: "Erro na estrutura da tabela",
        details: structureError,
      });
    }

    console.log("✅ Estrutura da tabela:", structureData);

    res.json({
      status: "OK",
      permissions: {
        products_trend: "✅ Acesso permitido",
        vw_oportunidades_trend: "✅ Acesso permitido",
      },
      counts: {
        products_trend_count: basicData,
        vw_oportunidades_trend_count: viewData,
      },
      sample_data: realData,
      table_structure: structureData,
      message: "Todas as permissões estão funcionando",
    });
  } catch (error) {
    console.error("Erro no teste de permissões:", error);
    res.status(500).json({
      error: "Erro interno",
      details: error.message,
    });
  }
});

// Fallback route for SPA - serve index.html for non-API routes
app.get("*", (req, res) => {
  // Don't redirect API routes
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Trend Hunter rodando na porta ${PORT}`);
  console.log(`📊 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
});
