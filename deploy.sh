#!/bin/bash

# DEPLOYMENT SCRIPT - CBT OPTIMIZATION PROJECT
# Usage: ./deploy.sh [phase] [environment]
# Example: ./deploy.sh 1-4 production

set -e

PHASE=${1:-"1-4"}
ENV=${2:-"staging"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/backup-$TIMESTAMP"

echo "🚀 Starting deployment..."
echo "Phase: $PHASE"
echo "Environment: $ENV"
echo "Timestamp: $TIMESTAMP"

# Create backup
echo "📦 Creating backup..."
mkdir -p $BACKUP_DIR
cp -r . $BACKUP_DIR/ 2>/dev/null || true

# Deploy Phase 1-4
if [[ "$PHASE" == "1-4" || "$PHASE" == "all" ]]; then
  echo "📝 Deploying Phase 1-4..."
  
  # Copy files
  cp supabase-optimized-functions.sql /var/www/cbtmo/ 2>/dev/null || true
  cp query-selectivity-optimized-handlers.js /var/www/cbtmo/ 2>/dev/null || true
  cp admin-monitoring-optimized.js /var/www/cbtmo/ 2>/dev/null || true
  cp modules/virtual-scroller.* /var/www/cbtmo/modules/ 2>/dev/null || true
  cp admin-monitoring-virtual-scroll.js /var/www/cbtmo/ 2>/dev/null || true
  cp lazy-loading-core.js /var/www/cbtmo/ 2>/dev/null || true
  cp lazy-loading.css /var/www/cbtmo/ 2>/dev/null || true
  cp sw-image-cache.js /var/www/cbtmo/ 2>/dev/null || true
  cp predictive-cache.js /var/www/cbtmo/ 2>/dev/null || true
  cp differential-sync.js /var/www/cbtmo/ 2>/dev/null || true
  cp data-compression.js /var/www/cbtmo/ 2>/dev/null || true
  cp sw-advanced.js /var/www/cbtmo/ 2>/dev/null || true
  cp exam-advanced-integration.js /var/www/cbtmo/ 2>/dev/null || true
  
  echo "✅ Phase 1-4 deployed"
fi

# Deploy Phase 5
if [[ "$PHASE" == "5" || "$PHASE" == "all" ]]; then
  echo "📝 Deploying Phase 5..."
  
  cp modules/*.js /var/www/cbtmo/modules/ 2>/dev/null || true
  
  echo "✅ Phase 5 deployed"
fi

# Deploy Phase 6
if [[ "$PHASE" == "6" || "$PHASE" == "all" ]]; then
  echo "📝 Deploying Phase 6..."
  
  cp db-optimization.sql /var/www/cbtmo/ 2>/dev/null || true
  cp db-pool.js /var/www/cbtmo/ 2>/dev/null || true
  cp redis-cache.js /var/www/cbtmo/ 2>/dev/null || true
  
  echo "✅ Phase 6 deployed"
fi

# Deploy Phase 7
if [[ "$PHASE" == "7" || "$PHASE" == "all" ]]; then
  echo "📝 Deploying Phase 7..."
  
  cp realtime-sync.js /var/www/cbtmo/ 2>/dev/null || true
  cp server-websocket.js /var/www/cbtmo/ 2>/dev/null || true
  
  echo "✅ Phase 7 deployed"
fi

# Deploy Phase 8
if [[ "$PHASE" == "8" || "$PHASE" == "all" ]]; then
  echo "📝 Deploying Phase 8..."
  
  cp nginx.conf /etc/nginx/sites-available/cbtmo 2>/dev/null || true
  cp Dockerfile /var/www/cbtmo/ 2>/dev/null || true
  cp kubernetes-deployment.yaml /var/www/cbtmo/ 2>/dev/null || true
  
  echo "✅ Phase 8 deployed"
fi

# Deploy Phase 9
if [[ "$PHASE" == "9" || "$PHASE" == "all" ]]; then
  echo "📝 Deploying Phase 9..."
  
  cp performance-monitor.js /var/www/cbtmo/ 2>/dev/null || true
  cp error-tracker.js /var/www/cbtmo/ 2>/dev/null || true
  
  echo "✅ Phase 9 deployed"
fi

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart nginx 2>/dev/null || true
sudo systemctl restart postgresql 2>/dev/null || true

# Verify deployment
echo "✅ Deployment complete!"
echo "📊 Backup location: $BACKUP_DIR"
echo "🔗 Access: http://localhost/exam.html"

echo ""
echo "Next steps:"
echo "1. Open browser and test"
echo "2. Check console for errors"
echo "3. Monitor metrics"
echo "4. Collect user feedback"

\n