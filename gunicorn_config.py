import multiprocessing
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2

accesslog = '-'
errorlog = '-'
loglevel = 'info'

proc_name = 'gunicorn_dictionary_app'
daemon = False
capture_output = True