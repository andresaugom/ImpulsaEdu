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
CREATE TRIGGER trg_users_updated_at_after
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

--Tabla: donors
CREATE TRIGGER trg_donors_updated_at_after
AFTER UPDATE ON donors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

-- Tabla: schools
CREATE TRIGGER trg_schools_updated_at_after
AFTER UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

-- Tabla: schools_needs
CREATE TRIGGER trg_schools_needs_updated_at_after
AFTER UPDATE ON schools_needs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

--Tabla: donations
CREATE TRIGGER trg_donations_updated_at_after
AFTER UPDATE ON donations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

--Tabla: donation_items
CREATE TRIGGER trg_donation_items_updated_at_after
AFTER UPDATE ON donation_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_after();

-- Update the goal and progress amounts on a school based on the donations and needs
CREATE OR REPLACE FUNCTION update_school_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE schools
    SET progress = COALESCE(SUM(di.amount), 0)
    FROM donation_items di
    JOIN donations d ON di.donation_id = d.id
    WHERE d.school_id = COALESCE(NEW.school_id, OLD.school_id)
    AND d.status IN ('Aprobado', 'Entregando', 'Entregado', 'Finalizado')
    AND d.deleted_at IS NULL;
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_donations_update_school_progress
AFTER INSERT OR UPDATE OR DELETE ON donations
FOR EACH ROW
EXECUTE FUNCTION update_school_progress();

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
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
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
CREATE TRIGGER trg_audit_donors
AFTER INSERT OR UPDATE ON donors
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER trg_audit_schools
AFTER INSERT OR UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER trg_audit_donations
AFTER INSERT OR UPDATE ON donations
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER trg_audit_schools_needs
AFTER INSERT OR UPDATE ON schools_needs
FOR EACH ROW
EXECUTE FUNCTION audit_log_changes();