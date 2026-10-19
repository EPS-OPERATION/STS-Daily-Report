-- One contractor per company (docs/plans/2026-10-19-one-contractor-per-company.md).
-- The per-discipline codes of a company (SCM, SEE, … → Sinoma) are merged into one row: the company keeps
-- the id of its "keep" code, every reference moves to it, the old codes become aliases, then the old rows go.
-- A database without these codes (fresh install: the seed already writes companies) is left unchanged.
-- Stops with an error, changing nothing, if two old codes of one company both have a report on the same day.
DO $$
DECLARE
  clashes integer;
BEGIN
  CREATE TEMP TABLE company_map ON COMMIT DROP AS
  SELECT o.id AS old_id, k.id AS new_id, m.old_code, m.new_code, m.new_name
  FROM (VALUES
    ('BEE', 'BEE', 'BW', 'Blue White'),
    ('FCE', 'FCE', 'FS', 'Fast steel'), ('FEE', 'FCE', 'FS', 'Fast steel'),
    ('KME', 'KME', 'KR', 'Khwan Rungrueang'),
    ('LCE', 'LCE', 'LT', 'L-tab'),
    ('PEE', 'PEE', 'PT', 'Pattara'),
    ('QCI', 'QME', 'UC', 'Unique Conveyor'), ('QEE', 'QME', 'UC', 'Unique Conveyor'), ('QME', 'QME', 'UC', 'Unique Conveyor'),
    ('RME', 'RME', 'RS', 'Ruangsan Engineer'),
    ('SCE', 'SCE', 'SZ', 'Szone'),
    ('SCI', 'SME', 'SN', 'Sinoma'), ('SCM', 'SME', 'SN', 'Sinoma'), ('SEE', 'SME', 'SN', 'Sinoma'), ('SFP', 'SME', 'SN', 'Sinoma'),
    ('SGE', 'SME', 'SN', 'Sinoma'), ('SIN', 'SME', 'SN', 'Sinoma'), ('SME', 'SME', 'SN', 'Sinoma'), ('SPI', 'SME', 'SN', 'Sinoma'),
    ('UME', 'UME', 'US', 'Utai Seya'), ('UPP', 'UME', 'US', 'Utai Seya'),
    ('ZCE', 'ZCE', 'ZT', 'Zhongtian')
  ) AS m(old_code, keep_code, new_code, new_name)
  JOIN contractors o ON o.code = m.old_code
  JOIN contractors k ON k.code = m.keep_code;

  SELECT count(*) INTO clashes FROM (
    SELECT r.project_id, c.new_id, r.report_date
    FROM daily_reports r JOIN company_map c ON c.old_id = r.contractor_id
    GROUP BY 1, 2, 3 HAVING count(*) > 1
  ) x;
  IF clashes > 0 THEN
    RAISE EXCEPTION 'merge companies: % day(s) where two old codes of one company both have a daily report — merge those reports first', clashes;
  END IF;

  INSERT INTO contractor_aliases (code, contractor_id)
  SELECT old_code, new_id FROM company_map
  ON CONFLICT (code) DO NOTHING;

  -- The company must be on every project its old codes were on (map items and colours point at that row).
  INSERT INTO project_contractors (project_id, contractor_id)
  SELECT DISTINCT pc.project_id, c.new_id
  FROM project_contractors pc JOIN company_map c ON c.old_id = pc.contractor_id
  ON CONFLICT DO NOTHING;

  -- One map colour per company: its own if it had one, else the first old code's.
  INSERT INTO coordination_colors (project_id, contractor_id, color)
  SELECT DISTINCT ON (cc.project_id, c.new_id) cc.project_id, c.new_id, cc.color
  FROM coordination_colors cc JOIN company_map c ON c.old_id = cc.contractor_id
  ORDER BY cc.project_id, c.new_id, (c.old_id = c.new_id) DESC, c.old_code
  ON CONFLICT DO NOTHING;

  -- Logins linked to an old code are linked to the company (one link per user + company + project).
  INSERT INTO contractor_memberships (user_id, contractor_id, project_id, status)
  SELECT DISTINCT ON (m.user_id, c.new_id, m.project_id) m.user_id, c.new_id, m.project_id, m.status
  FROM contractor_memberships m JOIN company_map c ON c.old_id = m.contractor_id
  ORDER BY m.user_id, c.new_id, m.project_id, (m.status = 'active') DESC
  ON CONFLICT DO NOTHING;

  UPDATE daily_reports t SET contractor_id = c.new_id FROM company_map c WHERE t.contractor_id = c.old_id AND c.old_id <> c.new_id;
  UPDATE inspection_requests t SET contractor_id = c.new_id FROM company_map c WHERE t.contractor_id = c.old_id AND c.old_id <> c.new_id;
  UPDATE site_activities t SET contractor_id = c.new_id FROM company_map c WHERE t.contractor_id = c.old_id AND c.old_id <> c.new_id;
  UPDATE safety_findings t SET contractor_id = c.new_id FROM company_map c WHERE t.contractor_id = c.old_id AND c.old_id <> c.new_id;
  UPDATE coordination_items t SET contractor_id = c.new_id FROM company_map c WHERE t.contractor_id = c.old_id AND c.old_id <> c.new_id;
  UPDATE daily_report_standard_items t SET contractor_id = c.new_id FROM company_map c WHERE t.contractor_id = c.old_id AND c.old_id <> c.new_id;
  UPDATE users t SET requested_contractor_id = c.new_id FROM company_map c WHERE t.requested_contractor_id = c.old_id AND c.old_id <> c.new_id;

  -- Old rows go (their project links, colours and memberships cascade); the company row takes its new name.
  DELETE FROM contractors WHERE id IN (SELECT old_id FROM company_map WHERE old_id <> new_id);
  UPDATE contractors t SET code = c.new_code, name = c.new_name, updated_at = now()
  FROM (SELECT DISTINCT new_id, new_code, new_name FROM company_map) c
  WHERE t.id = c.new_id;
END $$;
--> statement-breakpoint
-- The owner company stays (its data and logins) but is not a contractor.
UPDATE contractors SET is_contractor = false WHERE code = 'EPS';
