CREATE OR REPLACE FUNCTION update_updated_at_column_after()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.updated_at IS DISTINCT FROM NOW()) THEN
        EXECUTE format('UPDATE %I SET updated_at = NOW() WHERE id = $1', TG_TABLE_NAME)
        USING NEW.id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

--triggers

-- Tabla: users
DROP TRIGGER IF EXISTS trg_users_updated_at_after ON users;
CREATE TRIGGER trg_users_updated_at_after
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

--Tabla: donors
DROP TRIGGER IF EXISTS trg_donors_updated_at_after ON donors;
CREATE TRIGGER trg_donors_updated_at_after
AFTER UPDATE ON donors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

-- Tabla: schools
DROP TRIGGER IF EXISTS trg_schools_updated_at_after ON schools;
CREATE TRIGGER trg_schools_updated_at_after
AFTER UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

-- Tabla: schools_needs
DROP TRIGGER IF EXISTS trg_schools_needs_updated_at_after ON schools_needs;
CREATE TRIGGER trg_schools_needs_updated_at_after
AFTER UPDATE ON schools_needs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

--Tabla: donations
DROP TRIGGER IF EXISTS trg_donations_updated_at_after ON donations;
CREATE TRIGGER trg_donations_updated_at_after
AFTER UPDATE ON donations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

--Tabla: donation_items
DROP TRIGGER IF EXISTS trg_donation_items_updated_at_after ON donation_items;
CREATE TRIGGER trg_donation_items_updated_at_after
AFTER UPDATE ON donation_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

-- Update the goal and progress amounts on a school based on the donations and needs
CREATE OR REPLACE FUNCTION update_school_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
BEGIN
    -- When triggered from donation_items, look up school_id via the parent donation
    IF TG_TABLE_NAME = 'donation_items' THEN
        IF TG_OP = 'DELETE' THEN
            SELECT school_id INTO v_school_id FROM donations WHERE id = OLD.donation_id;
        ELSE
            SELECT school_id INTO v_school_id FROM donations WHERE id = NEW.donation_id;
        END IF;
    ELSE
        -- triggered from donations
        IF TG_OP = 'DELETE' THEN
            v_school_id := OLD.school_id;
        ELSE
            v_school_id := NEW.school_id;
        END IF;
    END IF;

    IF v_school_id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE schools
    SET progress = COALESCE((
        SELECT SUM(di.amount)
        FROM donation_items di
        JOIN donations d ON di.donation_id = d.id
        WHERE d.school_id = v_school_id
          AND d.status IN ('Aprobado', 'Entregando', 'Entregado', 'Finalizado')
          AND d.deleted_at IS NULL
          AND di.deleted_at IS NULL
    ), 0)
    WHERE id = v_school_id;

    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_donations_update_school_progress ON donations;
CREATE TRIGGER trg_donations_update_school_progress
AFTER INSERT OR UPDATE OR DELETE ON donations
FOR EACH ROW
EXECUTE FUNCTION update_school_progress();

DROP TRIGGER IF EXISTS trg_donation_items_update_school_progress ON donation_items;
CREATE TRIGGER trg_donation_items_update_school_progress
AFTER INSERT OR UPDATE OR DELETE ON donation_items
FOR EACH ROW
EXECUTE FUNCTION update_school_progress();

-- Generate audit logs for create, update, archive, and state change actions
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action;
    v_entity_type entity_type;
BEGIN
    -- Determine action type
    v_entity_type := CASE TG_TABLE_NAME
        WHEN 'donors'        THEN 'donor'
        WHEN 'donations'     THEN 'donation'
        WHEN 'schools'       THEN 'school'
        WHEN 'schools_needs' THEN 'school'
    END::entity_type;

    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_value)
        VALUES (NEW.created_by, v_entity_type, NEW.id, v_action, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if it's a state change or archive
        IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at AND NEW.deleted_at IS NOT NULL THEN
            v_action := 'archive';
        ELSIF (TG_TABLE_NAME IN ('donations', 'schools_needs')) AND
              OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'state_change';
        ELSE
            v_action := 'update';
        END IF;
        
        INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_value, new_value)
        VALUES (NEW.updated_by, v_entity_type, NEW.id, v_action, row_to_json(OLD), row_to_json(NEW));
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

-- Create audit triggers for relevant tables
DROP TRIGGER IF EXISTS trg_audit_donors ON donors;
CREATE TRIGGER trg_audit_donors
AFTER INSERT OR UPDATE ON donors
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_schools ON schools;
CREATE TRIGGER trg_audit_schools
AFTER INSERT OR UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_donations ON donations;
CREATE TRIGGER trg_audit_donations
AFTER INSERT OR UPDATE ON donations
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_schools_needs ON schools_needs;
CREATE TRIGGER trg_audit_schools_needs
AFTER INSERT OR UPDATE ON schools_needs
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();