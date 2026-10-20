INSERT INTO educational_resources (id, title, slug, resource_type, category, country_code, url, published_at)
VALUES ('resource-budget-es', 'Como hacer un presupuesto (FTC, Estados Unidos)', 'presupuesto-ftc-es', 'guide', 'Presupuesto', 'CR', 'https://consumidor.gov/su-dinero/como-hacer-un-presupuesto', NOW()),
('resource-emergency-cfpb', 'Fondo de emergencia (CFPB, ingles)', 'emergency-fund-cfpb', 'guide', 'Ahorro', 'CR', 'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/', NOW()),
('resource-debt-cfpb', 'Estrategias de reduccion de deuda (CFPB, ingles)', 'debt-strategies-cfpb', 'article', 'Deudas', 'CR', 'https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/', NOW())
ON CONFLICT (slug) DO NOTHING;
