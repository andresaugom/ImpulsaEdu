-- Run as postgres superuser

CREATE USER impulsaeduuser WITH PASSWORD 'Strong$Password123';

CREATE DATABASE impulsaedu OWNER impulsaeduuser;

\connect impulsaedu

-- Revoke default public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO impulsaeduuser;

-- Permissions on tables that already exist (if any)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO impulsaeduuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO impulsaeduuser;

-- Default privileges: tables and sequences created in the future are auto-granted
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO impulsaeduuser;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO impulsaeduuser;
