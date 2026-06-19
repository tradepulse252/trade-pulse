#!/bin/sh
# Render start script — migrations run at build time, not here (avoids Neon advisory lock timeout)
exec npm start
