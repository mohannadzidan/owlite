#!/bin/sh
set -e

CACHE_DIR="${TMDB_IMAGE_CACHE_PATH:-/var/cache/tmdb-images}"
MAX_AGE_DAYS="${TMDB_IMAGE_MAX_AGE_DAYS:-7}"

find "$CACHE_DIR" -type f -atime +"$MAX_AGE_DAYS" -delete
find "$CACHE_DIR" -type d -empty -delete

echo "[tmdb-cache-evict] done at $(date -u)"
