-- 010_seed_produtos.sql
INSERT INTO produtos (nome, descricao, preco, estoque)
SELECT 'Escova Alisadora 3 em 1 — Kit 1',
       'Escova pente alisadora ceramica, ions negativos, bivolt. Codigo ja3235j42j.',
       87.90, 50
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome LIKE 'Escova Alisadora 3 em 1 — Kit 1');

INSERT INTO produtos (nome, descricao, preco, estoque)
SELECT 'Escova Alisadora 3 em 1 — Kit 2',
       'Kit intermediario Escova Alisadora 3 em 1. EAN 7905340416715.',
       129.90, 40
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome LIKE 'Escova Alisadora 3 em 1 — Kit 2');

INSERT INTO produtos (nome, descricao, preco, estoque)
SELECT 'Escova Alisadora 3 em 1 — Kit 3',
       'Kit completo Escova Alisadora 3 em 1 — 5 temperaturas, cabo 360.',
       149.90, 30
WHERE NOT EXISTS (SELECT 1 FROM produtos WHERE nome LIKE 'Escova Alisadora 3 em 1 — Kit 3');
