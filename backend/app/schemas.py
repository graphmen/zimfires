from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import List, Optional, Any, Dict
from uuid import UUID

class GeoJSONObject(BaseModel):
    type: str

class PointGeometry(GeoJSONObject):
    type: str = "Point"
    coordinates: List[float]

class FireFeatureProperties(BaseModel):
    firms_id: Optional[str] = None
    observation_time: datetime
    sensor: Optional[str] = None
    brightness: Optional[float] = None
    confidence: Optional[str] = None
    frp: Optional[float] = None
    dataset: Optional[str] = None
    source_type: Optional[str] = None
    country_code: Optional[str] = "ZW"
    near_park: Optional[str] = "none"

class FireFeature(BaseModel):
    type: str = "Feature"
    id: str | UUID
    geometry: PointGeometry
    properties: FireFeatureProperties

    model_config = ConfigDict(from_attributes=True)

class FireFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[FireFeature]
    metadata: Dict[str, Any]

class BoundaryFeature(BaseModel):
    type: str = "Feature"
    id: str | UUID
    geometry: Dict[str, Any] # Polygon or MultiPolygon
    properties: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

class BoundaryCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[BoundaryFeature]

class BurnedAreaFeature(BaseModel):
    type: str = "Feature"
    id: str | UUID
    geometry: Dict[str, Any]
    properties: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

class BurnedAreaCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[BurnedAreaFeature]

class HistoricalTrendItem(BaseModel):
    year: int
    count: int
    total_area_ha: float

class HistoricalTrendResponse(BaseModel):
    data: List[HistoricalTrendItem]
    source: str = "PostGIS"
