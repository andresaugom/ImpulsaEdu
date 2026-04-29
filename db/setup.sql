-- Runs during container first-time initialization (docker-entrypoint-initdb.d).
-- POSTGRES_USER (impulsaedu) and POSTGRES_DB (impulsaedu) are already provisioned
-- by the official postgres image via environment variables — no need to CREATE USER
-- or CREATE DATABASE here.

-- Harden: deny public schema access to all roles except the application user.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO impulsaedu;
