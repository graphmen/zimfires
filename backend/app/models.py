import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Date, JSON, Integer, Text, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from sqlalchemy.sql import func
from .database import Base

class FireObservation(Base):
    __tablename__ = "fire_observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    geom = Column(Geometry('POINT', srid=4326), nullable=False)
    observation_time = Column(DateTime(timezone=True), nullable=False)
    ingestion_time = Column(DateTime(timezone=True), server_default=func.now())
    sensor = Column(String)
    dataset = Column(String)
    source_type = Column(String)
    firms_id = Column(String, unique=True)
    brightness = Column(Float)
    confidence = Column(String)
    frp = Column(Float)
    acquisition_date = Column(Date)
    country_code = Column(String, default="ZW")
    obs_metadata = Column("metadata", JSONB)

class AoiBoundary(Base):
    __tablename__ = "aoi_boundaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    geom = Column(Geometry('MULTIPOLYGON', srid=4326), nullable=False)
    country_code = Column(String, default="ZW")
    layer_type = Column(String)
    layer_metadata = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BurnedArea(Base):
    __tablename__ = "burned_areas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    geom = Column(Geometry('MULTIPOLYGON', srid=4326), nullable=False)
    year = Column(Integer, nullable=False)
    area_hectares = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset = Column(String, nullable=False)
    aoi_filter = Column(String)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    status = Column(String, default="queued")
    records_processed = Column(Integer, default=0)
    cursor_state = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    severity = Column(String, nullable=False) # critical, high, medium, info
    province_filter = Column(String)
    park_filter = Column(String)
    min_frp = Column(Float, default=0)
    min_confidence = Column(String, default="nominal")
    park_only = Column(Boolean, default=False)
    channels = Column(JSONB, default=[]) # e.g. ["Email", "SMS"]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TriggeredAlert(Base):
    __tablename__ = "triggered_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), nullable=False)
    observation_id = Column("fire_id", String, nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    details = Column("metadata", JSONB) # Maps to metadata column in Supabase
