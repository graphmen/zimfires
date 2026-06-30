import os
import sys
import json
import shapely.geometry

def generate_sql():
    # Setup paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_dir = os.path.join(base_dir, "data")
    sql_out_path = os.path.join(base_dir, "backend", "supabase", "migrations", "002_insert_boundaries.sql")
    
    provinces_file = os.path.join(data_dir, "Provinces.geojson")
    
    if not os.path.exists(provinces_file):
        print(f"Error: {provinces_file} not found.")
        sys.exit(1)
        
    with open(provinces_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"Generating SQL inserts from {len(data.get('features', []))} features...")
    
    with open(sql_out_path, 'w', encoding='utf-8') as sql_file:
        sql_file.write("-- Generated PostGIS Inserts for Zimbabwe Boundaries\n")
        sql_file.write("BEGIN;\n\n")
        
        for feature in data.get('features', []):
            properties = feature.get('properties', {})
            name = properties.get("PROV_NAME", "Unknown AOI")
            # Escape single quotes in name
            name = name.replace("'", "''") 
            
            geom_dict = feature.get('geometry')
            if not geom_dict:
                continue
                
            shape = shapely.geometry.shape(geom_dict)
            
            # Ensure it is a MultiPolygon
            if shape.geom_type == 'Polygon':
                shape = shapely.geometry.MultiPolygon([shape])
            elif shape.geom_type != 'MultiPolygon':
                continue
                
            # Get WKT (Well-Known Text)
            wkt = shape.wkt
            
            # Write the INSERT statement using ST_GeomFromText
            insert_stmt = f"""
INSERT INTO aoi_boundaries (name, geom, country_code) 
VALUES ('{name}', ST_GeomFromText('{wkt}', 4326), 'ZW');
"""
            sql_file.write(insert_stmt)
            
        sql_file.write("\nCOMMIT;\n")
        
    print(f"Successfully generated standard SQL inserts to: {sql_out_path}")

if __name__ == "__main__":
    generate_sql()
