import logging
import sys
import time
from functools import wraps

def setup_logger(name="ZimFireWatch"):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)

    # Structured JSON-esque formatting for production log parsing
    # Enhanced with module name for finer diagnostic granularity
    formatter = logging.Formatter(
        '{"time": "%(asctime)s", "name": "%(name)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}'
    )
    handler.setFormatter(formatter)
    
    # Avoid duplicate handlers
    if not logger.handlers:
        logger.addHandler(handler)
        
    return logger

log = setup_logger()

def time_logger(func):
    """Decorator to log execution time of async functions."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        t0 = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = round((time.time() - t0) * 1000, 2)
            log.info(f"Execution [ {func.__name__} ] took {duration}ms")
            return result
        except Exception as e:
            duration = round((time.time() - t0) * 1000, 2)
            log.error(f"Execution [ {func.__name__} ] FAILED after {duration}ms: {e}")
            raise
    return wrapper
