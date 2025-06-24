# utils/filters.py

def get_data_source_filter(data_source):
    """
    Genera el filtro WHERE para la fuente de datos seleccionada
    
    Args:
        data_source (str): "PostgreSQL", "MongoDB", o "Todos"
        
    Returns:
        str: Filtro SQL para usar en WHERE
    """
    if data_source == "PostgreSQL":
        return "AND fp.fuente_datos = 'postgres'"
    elif data_source == "MongoDB":
        return "AND fp.fuente_datos = 'mongo'"
    else:  # "Todos"
        return ""
