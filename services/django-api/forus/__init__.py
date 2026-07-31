# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from .celery import app as celery_app

__all__ = ("celery_app",)
