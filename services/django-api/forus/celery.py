# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Celery application. Beat schedules (reminders, auto-cancel, payouts) are wired in R6."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "forus.settings")

app = Celery("forus")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
