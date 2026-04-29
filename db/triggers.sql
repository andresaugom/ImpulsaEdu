-- 1. CORRECCIÓN DEL TIMESTAMP (Uso de BEFORE trigger para evitar recursión)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Aplicar a todas las tablas (Triggers BEFORE)
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_donors_updated_at ON donors;
CREATE TRIGGER trg_donors_updated_at BEFORE UPDATE ON donors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_schools_updated_at ON schools;
CREATE TRIGGER trg_schools_updated_at BEFORE UPDATE ON schools
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_schools_needs_updated_at ON schools_needs;
CREATE TRIGGER trg_schools_needs_updated_at BEFORE UPDATE ON schools_needs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_donations_updated_at ON donations;
CREATE TRIGGER trg_donations_updated_at BEFORE UPDATE ON donations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_donation_items_updated_at ON donation_items;
CREATE TRIGGER trg_donation_items_updated_at BEFORE UPDATE ON donation_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 2. SIMULACIÓN DE CASCADA (Para corregir el error del test sin tocar schema.sql)
-- Este trigger limpia las necesidades antes de que se borre la escuela
CREATE OR REPLACE FUNCTION fn_clean_orphaned_needs()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM schools_needs WHERE school_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_schools_cascade_delete ON schools;
CREATE TRIGGER trg_schools_cascade_delete
BEFORE DELETE ON schools
FOR EACH ROW EXECUTE FUNCTION fn_clean_orphaned_needs();


-- 3. ACTUALIZACIÓN DE PROGRESO (Optimizado)
CREATE OR REPLACE FUNCTION update_school_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_school_id UUID;
BEGIN
    -- Determinar el ID de la escuela afectado
    IF TG_TABLE_NAME = 'donations' THEN
        v_school_id := COALESCE(NEW.school_id, OLD.school_id);
    ELSIF TG_TABLE_NAME = 'donation_items' THEN
        SELECT school_id INTO v_school_id FROM donations WHERE id = COALESCE(NEW.donation_id, OLD.donation_id);
    END IF;

    IF v_school_id IS NOT NULL THEN
        UPDATE schools
        SET progress = (
            SELECT COALESCE(SUM(di.amount), 0)
            FROM donation_items di
            JOIN donations d ON di.donation_id = d.id
            WHERE d.school_id = v_school_id
            AND d.status IN ('Aprobado', 'Entregando', 'Entregado', 'Finalizado')
            AND d.deleted_at IS NULL
        )
        WHERE id = v_school_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_donations_update_school_progress ON donations;
CREATE TRIGGER trg_donations_update_school_progress
AFTER INSERT OR UPDATE OR DELETE ON donations
FOR EACH ROW EXECUTE FUNCTION update_school_progress();

DROP TRIGGER IF EXISTS trg_donation_items_update_school_progress ON donation_items;
CREATE TRIGGER trg_donation_items_update_school_progress
AFTER INSERT OR UPDATE OR DELETE ON donation_items
FOR EACH ROW EXECUTE FUNCTION update_school_progress();


-- 4. AUDIT LOGS (Corregido para manejar nulos y tipos)
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action;
    v_entity_type entity_type;
    v_user_id UUID;
BEGIN
    v_entity_type := CASE TG_TABLE_NAME
        WHEN 'donors'        THEN 'donor'::entity_type
        WHEN 'donations'     THEN 'donation'::entity_type
        WHEN 'schools'       THEN 'school'::entity_type
        WHEN 'schools_needs' THEN 'school'::entity_type
    END;

    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_value)
        VALUES (NEW.created_by, v_entity_type, NEW.id, v_action, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at AND NEW.deleted_at IS NOT NULL THEN
            v_action := 'archive';
        ELSIF (TG_TABLE_NAME = 'donations' AND OLD.status IS DISTINCT FROM NEW.status) THEN
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

-- Triggers de auditoría (Se mantienen igual)
DROP TRIGGER IF EXISTS trg_audit_donors ON donors;
CREATE TRIGGER trg_audit_donors AFTER INSERT OR UPDATE ON donors FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_schools ON schools;
CREATE TRIGGER trg_audit_schools AFTER INSERT OR UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_donations ON donations;
CREATE TRIGGER trg_audit_donations AFTER INSERT OR UPDATE ON donations FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_schools_needs ON schools_needs;
CREATE TRIGGER trg_audit_schools_needs AFTER INSERT OR UPDATE ON schools_needs FOR EACH ROW EXECUTE FUNCTION audit_log_changes();