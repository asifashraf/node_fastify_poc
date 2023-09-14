#!/bin/bash
node --max-old-space-size=8192 --optimize-for-size --max_old_space_size=8192 --optimize_for_size index.js && sleep 3 && npm run build-docs;
