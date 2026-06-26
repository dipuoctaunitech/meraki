import logging
import sys


def setup_logging(level: int = logging.INFO) -> None:
    """Configure structured application-wide logging for deployment."""
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)

    root_logger.setLevel(level)
    root_logger.addHandler(stream_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
