insert into public.interests (slug, label_es, category) values
('viajes','Viajes','estilo_de_vida'),
('cafe','Café','comida'),
('gastronomia','Gastronomía','comida'),
('cine','Cine','cultura'),
('musica','Música','cultura'),
('baile','Baile','actividad'),
('running','Running','deporte'),
('gym','Gimnasio','deporte'),
('playa','Playa','actividad'),
('senderismo','Senderismo','actividad'),
('fotografia','Fotografía','cultura'),
('perros','Perros','mascotas'),
('gatos','Gatos','mascotas')
on conflict (slug) do nothing;

insert into public.catalog_products (id, kind, name, tier, entitlements) values
('free','subscription','CitaFuego Free','free','{"daily_like_limit":25,"can_see_likers":false,"advanced_filters":false}'),
('fuego_plus','subscription','Fuego Plus','plus','{"daily_like_limit":9999,"rewind_limit":5,"advanced_filters":true,"incognito_mode":true}'),
('fuego_gold','subscription','Fuego Gold','gold','{"daily_like_limit":9999,"can_see_likers":true,"rewind_limit":9999,"advanced_filters":true,"incognito_mode":true,"boosts_per_period":1,"superfuegos_per_period":5}'),
('boost_30m','boost','Boost 30 minutos',null,'{"boost_minutes":30}'),
('superfuego_5','superfuego_pack','5 SuperFuego',null,'{"superfuego_credits":5}')
on conflict (id) do nothing;

insert into public.admin_roles (id, name, permissions) values
('super_admin','Super Admin','["*"]'),
('trust_safety','Trust & Safety','["users.read","reports.*","moderation.*","sanctions.*","appeals.*"]'),
('support','Support','["users.read_limited","support.*"]'),
('finance','Finance','["billing.*","users.billing_read"]'),
('analyst','Analyst','["analytics.read"]')
on conflict (id) do nothing;
