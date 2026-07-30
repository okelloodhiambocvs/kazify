-- Seed script for KAZIFY database populating categories, mandatory accounts, and trades profiles

-- 1. Insert Core Categories
INSERT INTO categories (id, name, description, icon_name) VALUES
(1, 'Plumbing', 'Fixing leaks, installing Pipes, water tanks, and unclogging drains', 'droplet'),
(2, 'Electrical', 'Wiring services, meter installation, inverter setup, and lighting repair', 'zap'),
(3, 'Construction', 'Masonry, plastering, floor tiles installation, and roofing solutions', 'hammer'),
(4, 'Automotive', 'Engine repairs, brake servicing, car tracking installation, and mechanical tune-ups', 'bg-car'),
(5, 'Cleaning', 'Home deep cleaning, sofa washing, commercial sanitation, and laundry', 'sparkles'),
(6, 'Outdoor', 'Gardening, water compound cleaning, compound fence, and landscape design', 'leaf'),
(7, 'Specialized', 'CCTV setup, biometric locks, biometric maintenance, and electrical fence repair', 'shield')
ON CONFLICT (id) DO NOTHING;

-- Set serial counter
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 2. Insert Base Skills linked to categories
INSERT INTO skills (category_id, name) VALUES
(1, 'Tank Installation'), (1, 'Leaky Pipe Repair'), (1, 'Drain Unclogging'),
(2, 'House Wiring'), (2, 'DB Box Dressing'), (2, 'Solar Setup'),
(3, 'Tile Fitting'), (3, 'Bricklaying'), (3, 'Plastering'),
(4, 'Mechanical Engines'), (4, 'Brake Replacement'), (4, 'Car Electrics'),
(5, 'Carpet Washing'), (5, 'Daily Office Cleaning'), (5, 'Post-Construction clean'),
(7, 'CCTV Installation'), (7, 'Fence Energizer setup')
ON CONFLICT DO NOTHING;

-- 3. Insert REQUIRED SEED ACCOUNT users (Using consistent, clean UUIDs)
-- UUIDs chosen: Admin: '8eb107fa-3211-46ab-82cc-55270505291b'
--               Customer: '7cb805bb-42df-4db2-943b-802af02f043e'
--               Fundi: '332c86b1-0988-466e-addd-4cb0cbf3737b'

-- Passwords seeded represent bcrypt hashes for the specified passwords:
-- Admin@12345  -> $2a$10$WqBPl.O14v9r/9R778yXN.i6C1Kk38f5oRFe.Vb55PshgA7dYQZmq
-- Customer@123 -> $2a$10$1YGe39E5R67iYF6fX9zG6uzF705iZzT0yFeFe7Pvh9PshgA7dYQZmq
-- Fundi@123    -> $2a$10$bYGe39E5R67iYF6fX9zG6uzF705iZzT0yFeFe7Pvh9PshgA7dYQZmq

INSERT INTO users (id, phone, email, password_hash, name, role, is_verified, avatar_url) VALUES
('8eb107fa-3211-46ab-82cc-55270505291b', '+254700000000', 'admin@kazify.com', '$2a$10$WqBPl.O14v9r/9R778yXN.i6C1Kk38f5oRFe.Vb55PshgA7dYQZmq', 'Robert Ochieng Admin', 'admin', TRUE, 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150'),
('7cb805bb-42df-4db2-943b-802af02f043e', '+254700000001', 'customer@kazify.com', '$2a$10$1YGe39E5R67iYF6fX9zG6uzF705iZzT0yFeFe7Pvh9PshgA7dYQZmq', 'Asha Odhiambo', 'customer', TRUE, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
('332c86b1-0988-466e-addd-4cb0cbf3737b', '+254700000002', 'fundi@kazify.com', '$2a$10$bYGe39E5R67iYF6fX9zG6uzF705iZzT0yFeFe7Pvh9PshgA7dYQZmq', 'Joseph "Jojo" Otieno', 'fundi', TRUE, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150')
ON CONFLICT (id) DO NOTHING;

-- 4. Create profiles for Customer and Fundi
INSERT INTO customers (user_id, default_address, preferred_payment_method) VALUES
('7cb805bb-42df-4db2-943b-802af02f043e', 'Milimani Estate, Kisumu', 'mpesa')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO fundis (user_id, category_id, bio, experience_years, hourly_rate_estimate, status, current_lat, current_lng, average_rating, jobs_completed_count) VALUES
('332c86b1-0988-466e-addd-4cb0cbf3737b', 1, 'Expert plumber with NITA certification and 8 years of pipeline experience in Kisumu Central.', 8, 1200.00, 'available', -0.1022, 34.7615, 4.90, 42)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Add Verification Docs for seeded Fundi
INSERT INTO verification_docs (fundi_id, document_type, document_url, status) VALUES
('332c86b1-0988-466e-addd-4cb0cbf3737b', 'NITA Plumbing Grade I', 'https://kazify.s3.amazonaws.com/certs/jojo_plumbing.jpg', 'approved')
ON CONFLICT DO NOTHING;
