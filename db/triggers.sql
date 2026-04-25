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