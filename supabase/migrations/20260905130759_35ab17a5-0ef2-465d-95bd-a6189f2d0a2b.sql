-- Multilingual catalogue labels: one JSONB field per record, five languages.
ALTER TABLE public.inventory_catalogue ADD COLUMN IF NOT EXISTS label_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.service_catalogue  ADD COLUMN IF NOT EXISTS label_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lead_queues        ADD COLUMN IF NOT EXISTS label_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lead_sources       ADD COLUMN IF NOT EXISTS label_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lead_loss_reasons  ADD COLUMN IF NOT EXISTS label_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.partner_categories ADD COLUMN IF NOT EXISTS label_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill the four existing language columns.
UPDATE public.service_catalogue  SET label_i18n = jsonb_build_object('de', label_de, 'fr', label_fr, 'it', label_it, 'en', label_en) WHERE label_i18n = '{}'::jsonb;
UPDATE public.lead_queues        SET label_i18n = jsonb_build_object('de', label_de, 'fr', label_fr, 'it', label_it, 'en', label_en) WHERE label_i18n = '{}'::jsonb;
UPDATE public.lead_sources       SET label_i18n = jsonb_build_object('de', label_de, 'fr', label_fr, 'it', label_it, 'en', label_en) WHERE label_i18n = '{}'::jsonb;
UPDATE public.lead_loss_reasons  SET label_i18n = jsonb_build_object('de', label_de, 'fr', label_fr, 'it', label_it, 'en', label_en) WHERE label_i18n = '{}'::jsonb;
UPDATE public.partner_categories SET label_i18n = jsonb_build_object('de', label_de, 'fr', label_fr, 'it', label_it, 'en', label_en) WHERE label_i18n = '{}'::jsonb;
UPDATE public.inventory_catalogue SET label_i18n = jsonb_build_object('de', name_de) WHERE label_i18n = '{}'::jsonb;

-- Seeded inventory items in all five languages.
WITH t(de, fr, it, en, ar) AS (VALUES
  ('Sofa','Canapé','Divano','Sofa','أريكة'),
  ('Sessel','Fauteuil','Poltrona','Armchair','كرسي بذراعين'),
  ('Esstisch','Table à manger','Tavolo da pranzo','Dining table','طاولة طعام'),
  ('Stuhl','Chaise','Sedia','Chair','كرسي'),
  ('TV','TV','TV','TV','تلفزيون'),
  ('Bett','Lit','Letto','Bed','سرير'),
  ('Kleiderschrank','Armoire','Armadio','Wardrobe','خزانة ملابس'),
  ('Kommode','Commode','Cassettiera','Chest of drawers','خزانة أدراج'),
  ('Waschmaschine','Lave-linge','Lavatrice','Washing machine','غسالة'),
  ('Kühlschrank','Réfrigérateur','Frigorifero','Refrigerator','ثلاجة'),
  ('Bürotisch','Bureau','Scrivania','Office desk','مكتب'),
  ('Gartenmöbel','Mobilier de jardin','Mobili da giardino','Outdoor furniture','أثاث حديقة'),
  ('Kellerregal','Étagère de cave','Scaffale da cantina','Basement shelf','رف قبو'),
  ('Kiste','Carton','Scatolone','Box','صندوق'),
  ('Klavier','Piano','Pianoforte','Piano','بيانو'),
  ('Tresor','Coffre-fort','Cassaforte','Safe','خزنة')
)
UPDATE public.inventory_catalogue i
SET label_i18n = jsonb_build_object('de', t.de, 'fr', t.fr, 'it', t.it, 'en', t.en, 'ar', t.ar)
FROM t WHERE i.name_de = t.de;

-- Arabic for the seeded services, queues and sources.
WITH t(de, ar) AS (VALUES
  ('Umzüge','خدمات النقل'),
  ('Reinigung','التنظيف'),
  ('Räumung / Entsorgung','الإخلاء والتخلص من النفايات'),
  ('Lagerung','التخزين'),
  ('Transport','النقل'),
  ('Offerte / Besichtigung','عرض سعر / معاينة')
)
UPDATE public.service_catalogue s SET label_i18n = s.label_i18n || jsonb_build_object('ar', t.ar) FROM t WHERE s.label_de = t.de;

WITH t(de, ar) AS (VALUES
  ('Verkauf & Disposition','المبيعات والتوزيع'),
  ('Geschäftskunden','عملاء الشركات'),
  ('Support','الدعم')
)
UPDATE public.lead_queues q SET label_i18n = q.label_i18n || jsonb_build_object('ar', t.ar) FROM t WHERE q.label_de = t.de;

WITH t(de, ar) AS (VALUES
  ('Website-Formular','نموذج الموقع الإلكتروني'),
  ('Online-Planer','المخطط الإلكتروني'),
  ('B2B-Anfrage','طلب من الشركات'),
  ('WhatsApp','واتساب'),
  ('Telefon','الهاتف'),
  ('E-Mail','البريد الإلكتروني')
)
UPDATE public.lead_sources s SET label_i18n = s.label_i18n || jsonb_build_object('ar', t.ar) FROM t WHERE s.label_de = t.de;