-- 005_create_sales.sql
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(30) NOT NULL,
    product_id INTEGER REFERENCES produtos(id),
    quantidade INTEGER DEFAULT 1,
    valor_total DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales(phone);
