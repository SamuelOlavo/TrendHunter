-- SQL para integração da Shopee na Trend Hunter Platform
-- Execute estas instruções no SQL Editor do Supabase

-- 1. Habilitar RLS na tabela shopee_trend (se ainda não estiver)
ALTER TABLE shopee_trend ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas RLS para acesso público à shopee_trend
CREATE POLICY "Enable read access for Shopee trend data" ON shopee_trend
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for Shopee trend data" ON shopee_trend
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for Shopee trend data" ON shopee_trend
    FOR UPDATE USING (true);

-- 3. Criar view unificada para análise cross-platform
CREATE OR REPLACE VIEW vw_all_platforms_trend AS
SELECT 
    id::text as id, -- Converter UUID para text
    platform,
    name,
    category,
    ranking,
    price_current,
    image_url,
    url,
    scraped_at,
    data,
    NULL::integer as sales, -- Para products_trend
    NULL::numeric as rating_star, -- Para products_trend
    NULL::numeric as commission, -- Para products_trend
    NULL::bigint as item_id, -- Para products_trend
    NULL::bigint as shop_id, -- Para products_trend
    NULL::text as url_afiliado -- Para products_trend
FROM products_trend

UNION ALL

SELECT 
    id::text as id, -- Manter consistência com text
    'Shopee' as platform,
    name,
    category,
    NULL::integer as ranking, -- Shopee não tem ranking direto
    price as price_current,
    image_url,
    url_product as url,
    scraped_at,
    data,
    sales,
    rating_star,
    commission,
    item_id,
    shop_id,
    url_afiliado
FROM shopee_trend;

-- 4. Criar view para oportunidades cross-platform
CREATE OR REPLACE VIEW vw_cross_platform_opportunities AS
SELECT 
    'Amazon' as platform,
    name,
    category,
    price_current,
    image_url,
    url,
    scraped_at,
    -- Para Amazon, calcular queda baseado em dados históricos (se disponíveis)
    0::numeric as porcentagem_queda,
    ranking::numeric as ranking
FROM products_trend 
WHERE platform = 'Amazon'

UNION ALL

SELECT 
    'Mercado Livre' as platform,
    name,
    category,
    price_current,
    image_url,
    url,
    scraped_at,
    -- Para Mercado Livre, calcular queda baseado em dados históricos (se disponíveis)
    0::numeric as porcentagem_queda,
    ranking::numeric as ranking
FROM products_trend 
WHERE platform = 'Mercado Livre'

UNION ALL

SELECT 
    'Shopee' as platform,
    name,
    category,
    price as price_current,
    image_url,
    url_product as url,
    scraped_at,
    -- Para Shopee, usar comissão como oportunidade
    commission::numeric as porcentagem_queda,
    (sales * rating_star)::numeric as ranking
FROM shopee_trend
WHERE commission > 0 OR (sales * rating_star) > 100;

-- 5. Função para calcular ranking score da Shopee
CREATE OR REPLACE FUNCTION calculate_shopee_ranking_score(
    sales_param INTEGER DEFAULT 0,
    rating_star_param NUMERIC DEFAULT 0
) RETURNS NUMERIC AS $$
BEGIN
    RETURN sales_param * rating_star_param;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. View específica para top produtos da Shopee
CREATE OR REPLACE VIEW vw_shopee_top_products AS
SELECT 
    *,
    (sales * rating_star) as ranking_score,
    CASE 
        WHEN sales >= 1000 THEN 'Alto Desempenho'
        WHEN sales >= 100 THEN 'Bom Desempenho'
        WHEN sales >= 10 THEN 'Desempenho Médio'
        ELSE 'Baixo Desempenho'
    END as performance_category
FROM shopee_trend
WHERE sales > 0 AND rating_star > 0
ORDER BY (sales * rating_star) DESC;

-- 7. Índices para performance da Shopee
CREATE INDEX IF NOT EXISTS idx_shopee_trend_sales ON shopee_trend(sales DESC);
CREATE INDEX IF NOT EXISTS idx_shopee_trend_rating ON shopee_trend(rating_star DESC);
CREATE INDEX IF NOT EXISTS idx_shopee_trend_category ON shopee_trend(category);
CREATE INDEX IF NOT EXISTS idx_shopee_trend_scraped_at ON shopee_trend(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopee_trend_ranking_score ON shopee_trend((sales * rating_star) DESC);

-- 8. Função para estatísticas cross-platform
CREATE OR REPLACE FUNCTION cross_platform_stats() 
RETURNS TABLE(
    platform TEXT,
    total_products BIGINT,
    avg_price NUMERIC,
    total_sales BIGINT,
    avg_rating NUMERIC,
    top_category TEXT,
    last_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.platform,
        COUNT(*) as total_products,
        AVG(p.price_current) as avg_price,
        COALESCE(SUM(p.sales), 0) as total_sales,
        COALESCE(AVG(p.rating_star), 0) as avg_rating,
        (
            SELECT category 
            FROM vw_all_platforms_trend p2 
            WHERE p2.platform = p.platform AND p2.category IS NOT NULL
            GROUP BY category 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as top_category,
        MAX(p.scraped_at) as last_update
    FROM vw_all_platforms_trend p
    GROUP BY p.platform
    ORDER BY total_products DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. View para dashboard cross-platform
CREATE OR REPLACE VIEW vw_dashboard_cross_platform AS
SELECT 
    platform,
    COUNT(*) as total_products,
    COUNT(DISTINCT category) as total_categories,
    AVG(price_current) as avg_price,
    MIN(price_current) as min_price,
    MAX(price_current) as max_price,
    COALESCE(SUM(sales), 0) as total_sales,
    COALESCE(AVG(rating_star), 0) as avg_rating,
    MAX(scraped_at) as last_update
FROM vw_all_platforms_trend
WHERE scraped_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY platform
ORDER BY total_products DESC;
