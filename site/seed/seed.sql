-- SAMPLE DATA for local development only. Titles, prices and descriptions are placeholders
-- for Frank to replace in the admin area. Do not run this against the live database.
DELETE FROM product_images;
DELETE FROM products;
DELETE FROM events;

INSERT INTO products (id, slug, title, description, price_pence, stock, kind, sort) VALUES
 (1, 'mug', 'Mug', 'Slip-trailed earthenware mug. About 300ml.', 2800, 12, 'range', 1),
 (2, 'lidded-pot', 'Lidded pot', 'Small lidded pot with a trailed star lid.', 3200, 6, 'range', 2),
 (3, 'plate', 'Plate', 'Slab-rolled side plate, about 20cm across.', 2600, 8, 'range', 3),
 (4, 'small-round-vase', 'Small round vase', 'Bud vase, about 9cm tall.', 2400, 10, 'range', 4),
 (5, 'horse', 'Little horse', 'Hand-modelled slipware horse, about 8cm long.', 2000, 8, 'range', 5),
 (6, 'beaker', 'Beaker', 'Straight-sided beaker for water, wine or tea.', 2200, 2, 'range', 6),
 (7, 'teapot', 'Striped teapot', 'Black and white trailed teapot. Holds about 1 litre.', 12000, 1, 'oneoff', 7),
 (8, 'round-bottle', 'Round bottle', 'Squat bottle in black and cream slip.', 6500, 1, 'oneoff', 8),
 (9, 'eared-flask', 'Eared flask', 'Small flask with two pierced ears.', 5500, 1, 'oneoff', 9),
 (10, 'marbled-jar', 'Marbled jar', 'Lidded jar with feathered slip.', 7000, 0, 'oneoff', 10);

INSERT INTO product_images (product_id, url, alt, sort) VALUES
 (1, '/img/new/n17.webp', 'Slip-trailed mug', 0),
 (1, '/img/new/n19.webp', 'Brown and cream mug', 1),
 (1, '/img/new/n18.webp', 'Mug detail', 2),
 (2, '/img/new/n24.webp', 'Lidded pots with star lids', 0),
 (2, '/img/new/n22.webp', 'Striped lidded pots', 1),
 (3, '/img/new/n11.webp', 'Striped plate', 0),
 (3, '/img/new/n08.webp', 'Two plates', 1),
 (4, '/img/new/n34.jpg', 'Two small round vases', 0),
 (4, '/img/pots/2.jpg', 'Three small round vases', 1),
 (5, '/img/new/n12.webp', 'Little slipware horse', 0),
 (5, '/img/new/n13.webp', 'Three little animals', 1),
 (6, '/img/new/n21.webp', 'Beakers', 0),
 (6, '/img/new/n20.webp', 'A set of beakers', 1),
 (7, '/img/new/n28.jpg', 'Striped teapot', 0),
 (7, '/img/new/n27.jpg', 'Striped teapot, other side', 1),
 (8, '/img/new/n07.webp', 'Round bottle', 0),
 (9, '/img/new/n04.webp', 'Eared flask', 0),
 (10, '/img/new/n01.webp', 'Marbled lidded jar', 0);

INSERT INTO events (title, location, starts_on, ends_on, link, notes) VALUES
 ('Sample: Christmas craft fair', 'Cotswolds', '2026-12-05', '2026-12-06', NULL, ''),
 ('Sample: Spring pottery market', 'Oxfordshire', '2027-04-18', NULL, NULL, '');
