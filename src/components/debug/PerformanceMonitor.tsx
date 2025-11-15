/**
 * Performance Monitor Component
 *
 * Debug component to display Web Vitals metrics in development.
 * Only renders in development mode or when explicitly enabled.
 */

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRecordedMetrics, clearRecordedMetrics } from '@/utils/performance/web-vitals';

interface MetricData {
  name: string;
  value: number;
  rating: string;
  timestamp: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development or when localStorage flag is set
  useEffect(() => {
    const shouldShow =
      import.meta.env.DEV || localStorage.getItem('showPerformanceMonitor') === 'true';

    setIsVisible(shouldShow);
  }, []);

  // Poll for new metrics
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      setMetrics(getRecordedMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleClear = () => {
    clearRecordedMetrics();
    setMetrics([]);
  };

  const handleToggle = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    localStorage.setItem('showPerformanceMonitor', String(newState));
  };

  if (!isVisible && !import.meta.env.DEV) return null;

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'good':
        return 'bg-green-500';
      case 'needs-improvement':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatValue = (metric: MetricData) => {
    if (metric.name === 'CLS') {
      return metric.value.toFixed(3);
    }
    return `${Math.round(metric.value)}ms`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible && (
        <Button onClick={handleToggle} variant="outline" size="sm" className="shadow-lg">
          Show Performance
        </Button>
      )}

      {isVisible && (
        <Card className="w-80 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Web Vitals Monitor</CardTitle>
            <div className="flex gap-1">
              <Button onClick={handleClear} variant="ghost" size="sm" className="h-6 text-xs">
                Clear
              </Button>
              <Button onClick={handleToggle} variant="ghost" size="sm" className="h-6 text-xs">
                Hide
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No metrics recorded yet. Interact with the page to generate metrics.
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.map((metric, index) => (
                  <div
                    key={`${metric.name}-${index}`}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{metric.name}</span>
                        <Badge
                          variant="outline"
                          className={`${getRatingColor(metric.rating)} text-white text-xs`}
                        >
                          {metric.rating.split('-').join(' ')}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-sm font-mono">{formatValue(metric)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-md bg-muted p-2 text-xs text-muted-foreground">
              <p className="font-medium">Metrics are stored in sessionStorage</p>
              <p className="mt-1">
                Run <code className="rounded bg-background px-1">npm run lighthouse</code> for full
                audit
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
