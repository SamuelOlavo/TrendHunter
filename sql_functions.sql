-- Funções SQL para o Supabase
-- Execute estas funções no SQL Editor do Supabase

-- 1. Função para executar SQL dinamicamente
CREATE OR REPLACE FUNCTION execute_sql(query_param TEXT, params_array TEXT[] DEFAULT '{}')
RETURNS TABLE()
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result RECORD;
BEGIN
    -- Validação de segurança
    IF UPPER(query_param) LIKE '%DROP%' OR 
       UPPER(query_param) LIKE '%DELETE%' OR
       UPPER(query_param) LIKE '%UPDATE%' OR
       UPPER(query_param) LIKE '%INSERT%' OR
       UPPER(query_param) LIKE '%ALTER%' OR
       UPPER(query_param) LIKE '%CREATE%' THEN
        RAISE EXCEPTION 'Operação não permitida: Apenas SELECT é permitido';
    END IF;
    
    -- Executa a query dinamicamente
    RETURN QUERY EXECUTE format(query_param, VARIADIC params_array);
END;
$$;

-- 2. Função para estatísticas diárias
CREATE OR REPLACE FUNCTION daily_stats(date_param DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    platform TEXT,
    total_products BIGINT,
    avg_price NUMERIC,
    min_price NUMERIC,
    max_price NUMERIC,
    top_category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.platform,
        COUNT(*) as total_products,
        AVG(p.price_current::numeric) as avg_price,
        MIN(p.price_current::numeric) as min_price,
        MAX(p.price_current::numeric) as max_price,
        (
            SELECT category 
            FROM products_trend p2 
            WHERE p2.platform = p.platform AND p2.data = date_param
            GROUP BY category 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as top_category
    FROM products_trend p
    WHERE p.data = date_param
    GROUP BY p.platform;
END;
$$;

-- 3. Função para tendências de preços
CREATE OR REPLACE FUNCTION price_trends(days_param INTEGER DEFAULT 7)
RETURNS TABLE(
    data DATE,
    platform TEXT,
    avg_price NUMERIC,
    product_count BIGINT,
    price_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result RECORD;
    previous_avg NUMERIC;
BEGIN
    RETURN QUERY
    WITH daily_prices AS (
        SELECT 
            data,
            platform,
            AVG(price_current::numeric) as avg_price,
            COUNT(*) as product_count
        FROM products_trend
        WHERE data >= CURRENT_DATE - INTERVAL '%s days'::INTERVAL
        GROUP BY data, platform
        ORDER BY data, platform
    ),
    price_changes AS (
        SELECT 
            data,
            platform,
            avg_price,
            product_count,
            LAG(avg_price) OVER (PARTITION BY platform ORDER BY data) as previous_avg
        FROM daily_prices
    )
    SELECT 
        data,
        platform,
        avg_price,
        product_count,
        CASE 
            WHEN previous_avg IS NULL THEN 0
            ELSE ((avg_price - previous_avg) / previous_avg) * 100
        END as price_change
    FROM price_changes;
END;
$$;

-- 4. Função para top produtos
CREATE OR REPLACE FUNCTION top_products(limit_param INTEGER DEFAULT 10, platform_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    ranking INTEGER,
    platform TEXT,
    name TEXT,
    category TEXT,
    price_current NUMERIC,
    image_url TEXT,
    url TEXT,
    data DATE,
    score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.ranking,
        p.platform,
        p.name,
        p.category,
        p.price_current::numeric,
        p.image_url,
        p.url,
        p.data,
        -- Score baseado em ranking inverso e preço
        (100.0 / p.ranking) * (1.0 / (p.price_current::numeric + 1)) * 1000 as score
    FROM products_trend p
    WHERE 
        p.data >= CURRENT_DATE - INTERVAL '7 days'
        AND (platform_filter IS NULL OR p.platform = platform_filter)
    ORDER BY score DESC
    LIMIT limit_param;
END;
$$;

-- 5. Função para análise de categorias
CREATE OR REPLACE FUNCTION category_analysis(category_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    category TEXT,
    platform TEXT,
    product_count BIGINT,
    avg_price NUMERIC,
    price_range NUMERIC,
    top_product TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.category,
        p.platform,
        COUNT(*) as product_count,
        AVG(p.price_current::numeric) as avg_price,
        (MAX(p.price_current::numeric) - MIN(p.price_current::numeric)) as price_range,
        (
            SELECT name 
            FROM products_trend p2 
            WHERE p2.category = p.category AND p2.platform = p.platform
            ORDER BY p2.ranking ASC 
            LIMIT 1
        ) as top_product
    FROM products_trend p
    WHERE 
        p.data >= CURRENT_DATE - INTERVAL '30 days'
        AND (category_filter IS NULL OR p.category = category_filter)
    GROUP BY p.category, p.platform
    ORDER BY product_count DESC;
END;
$$;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_trend_platform ON products_trend(platform);
CREATE INDEX IF NOT EXISTS idx_products_trend_category ON products_trend(category);
CREATE INDEX IF NOT EXISTS idx_products_trend_data ON products_trend(data);
CREATE INDEX IF NOT EXISTS idx_products_trend_ranking ON products_trend(ranking);
CREATE INDEX IF NOT EXISTS idx_products_trend_composite ON products_trend(platform, data, ranking);

-- 7. View para dashboard
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
    COUNT(*) as total_products,
    COUNT(DISTINCT platform) as total_platforms,
    COUNT(DISTINCT category) as total_categories,
    AVG(price_current::numeric) as avg_price,
    MIN(price_current::numeric) as min_price,
    MAX(price_current::numeric) as max_price,
    COUNT(DISTINCT data) as days_tracked
FROM products_trend
WHERE data >= CURRENT_DATE - INTERVAL '30 days';

-- 8. Trigger para auditoria
CREATE OR REPLACE FUNCTION audit_products_trend()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO products_trend_audit (
        table_name, 
        operation, 
        operation_time, 
        user_id,
        old_data,
        new_data
    ) VALUES (
        'products_trend',
        TG_OP,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        row_to_json(OLD),
        row_to_json(NEW)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Tabela de auditoria (se não existir)
CREATE TABLE IF NOT EXISTS products_trend_audit (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT,
    operation TEXT,
    operation_time TIMESTAMP WITH TIME ZONE,
    user_id TEXT,
    old_data JSONB,
    new_data JSONB
);

-- Criar trigger
DROP TRIGGER IF EXISTS products_trend_trigger ON products_trend;
CREATE TRIGGER products_trend_trigger
    AFTER INSERT OR UPDATE OR DELETE ON products_trend
    FOR EACH ROW
    EXECUTE FUNCTION audit_products_trend();
