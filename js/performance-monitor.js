/**
 * PerformanceMonitor - パフォーマンス監視クラス
 * アプリケーションのパフォーマンス指標を監視し、最適化の効果を測定
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
        this.isEnabled = true;
        this.reportInterval = 30000; // 30秒間隔でレポート
        this.startTime = performance.now();
        
        this.initializeObservers();
        this.startPeriodicReporting();
    }

    /**
     * パフォーマンス監視を初期化
     */
    initializeObservers() {
        // Long Task Observer (長時間実行タスクの監視)
        if ('PerformanceObserver' in window) {
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.recordMetric('longTask', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            name: entry.name
                        });
                    }
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.push(longTaskObserver);
            } catch (error) {
                console.warn('Long Task Observer not supported:', error);
            }
        }

        // Navigation Timing (ページ読み込み時間の監視)
        if (performance.navigation) {
            this.recordNavigationTiming();
        }

        // Memory Usage (メモリ使用量の監視)
        if (performance.memory) {
            this.startMemoryMonitoring();
        }
    }

    /**
     * ナビゲーションタイミングを記録
     */
    recordNavigationTiming() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            this.recordMetric('navigation', {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                domInteractive: navigation.domInteractive - navigation.navigationStart,
                firstPaint: this.getFirstPaintTime(),
                firstContentfulPaint: this.getFirstContentfulPaintTime()
            });
        }
    }

    /**
     * First Paint時間を取得
     */
    getFirstPaintTime() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }

    /**
     * First Contentful Paint時間を取得
     */
    getFirstContentfulPaintTime() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return firstContentfulPaint ? firstContentfulPaint.startTime : null;
    }

    /**
     * メモリ監視を開始
     */
    startMemoryMonitoring() {
        setInterval(() => {
            if (performance.memory) {
                this.recordMetric('memory', {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                });
            }
        }, 10000); // 10秒間隔
    }

    /**
     * メトリクスを記録
     */
    recordMetric(category, data) {
        if (!this.isEnabled) return;

        if (!this.metrics.has(category)) {
            this.metrics.set(category, []);
        }

        const entry = {
            ...data,
            timestamp: Date.now(),
            relativeTime: performance.now() - this.startTime
        };

        this.metrics.get(category).push(entry);

        // 古いデータを削除（最新100件を保持）
        const categoryMetrics = this.metrics.get(category);
        if (categoryMetrics.length > 100) {
            categoryMetrics.splice(0, categoryMetrics.length - 100);
        }
    }

    /**
     * 操作のパフォーマンスを測定
     */
    measureOperation(name, operation) {
        const startTime = performance.now();
        const startMark = `${name}-start`;
        const endMark = `${name}-end`;
        const measureName = `${name}-duration`;

        performance.mark(startMark);

        const result = operation();

        if (result && typeof result.then === 'function') {
            // 非同期操作の場合
            return result.then(
                (value) => {
                    performance.mark(endMark);
                    performance.measure(measureName, startMark, endMark);
                    
                    const duration = performance.now() - startTime;
                    this.recordMetric('operations', {
                        name,
                        duration,
                        success: true,
                        async: true
                    });
                    
                    return value;
                },
                (error) => {
                    performance.mark(endMark);
                    performance.measure(measureName, startMark, endMark);
                    
                    const duration = performance.now() - startTime;
                    this.recordMetric('operations', {
                        name,
                        duration,
                        success: false,
                        error: error.message,
                        async: true
                    });
                    
                    throw error;
                }
            );
        } else {
            // 同期操作の場合
            performance.mark(endMark);
            performance.measure(measureName, startMark, endMark);
            
            const duration = performance.now() - startTime;
            this.recordMetric('operations', {
                name,
                duration,
                success: true,
                async: false
            });
            
            return result;
        }
    }

    /**
     * UI更新のパフォーマンスを測定
     */
    measureUIUpdate(elementKey, updateFunction) {
        return this.measureOperation(`ui-update-${elementKey}`, updateFunction);
    }

    /**
     * データ読み込みのパフォーマンスを測定
     */
    measureDataLoad(dataType, loadFunction) {
        return this.measureOperation(`data-load-${dataType}`, loadFunction);
    }

    /**
     * 定期的なパフォーマンスレポートを開始
     */
    startPeriodicReporting() {
        setInterval(() => {
            this.generatePerformanceReport();
        }, this.reportInterval);
    }

    /**
     * パフォーマンスレポートを生成
     */
    generatePerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            uptime: performance.now() - this.startTime,
            metrics: this.getMetricsSummary(),
            recommendations: this.generateRecommendations()
        };

        console.log('📊 Performance Report:', report);
        
        // パフォーマンス問題があれば警告
        if (report.recommendations.length > 0) {
            console.warn('⚠️ Performance Issues Detected:', report.recommendations);
        }

        return report;
    }

    /**
     * メトリクスサマリーを取得
     */
    getMetricsSummary() {
        const summary = {};

        for (const [category, entries] of this.metrics.entries()) {
            if (entries.length === 0) continue;

            switch (category) {
                case 'operations':
                    summary[category] = this.summarizeOperations(entries);
                    break;
                case 'memory':
                    summary[category] = this.summarizeMemory(entries);
                    break;
                case 'longTask':
                    summary[category] = this.summarizeLongTasks(entries);
                    break;
                default:
                    summary[category] = {
                        count: entries.length,
                        latest: entries[entries.length - 1]
                    };
            }
        }

        return summary;
    }

    /**
     * 操作メトリクスをサマリー
     */
    summarizeOperations(entries) {
        const durations = entries.map(e => e.duration);
        const successCount = entries.filter(e => e.success).length;
        
        return {
            total: entries.length,
            successRate: (successCount / entries.length * 100).toFixed(1) + '%',
            averageDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) + 'ms',
            maxDuration: Math.max(...durations).toFixed(2) + 'ms',
            minDuration: Math.min(...durations).toFixed(2) + 'ms',
            slowOperations: entries.filter(e => e.duration > 100).length
        };
    }

    /**
     * メモリメトリクスをサマリー
     */
    summarizeMemory(entries) {
        const latest = entries[entries.length - 1];
        const first = entries[0];
        
        return {
            current: {
                used: (latest.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
                total: (latest.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
                limit: (latest.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB'
            },
            growth: {
                used: ((latest.usedJSHeapSize - first.usedJSHeapSize) / 1024 / 1024).toFixed(2) + 'MB',
                total: ((latest.totalJSHeapSize - first.totalJSHeapSize) / 1024 / 1024).toFixed(2) + 'MB'
            }
        };
    }

    /**
     * 長時間タスクをサマリー
     */
    summarizeLongTasks(entries) {
        const durations = entries.map(e => e.duration);
        
        return {
            count: entries.length,
            totalDuration: durations.reduce((a, b) => a + b, 0).toFixed(2) + 'ms',
            averageDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) + 'ms',
            maxDuration: Math.max(...durations).toFixed(2) + 'ms'
        };
    }

    /**
     * パフォーマンス改善の推奨事項を生成
     */
    generateRecommendations() {
        const recommendations = [];

        // 長時間タスクのチェック
        const longTasks = this.metrics.get('longTask') || [];
        if (longTasks.length > 0) {
            const avgDuration = longTasks.reduce((sum, task) => sum + task.duration, 0) / longTasks.length;
            if (avgDuration > 100) {
                recommendations.push({
                    type: 'performance',
                    severity: 'high',
                    message: `長時間実行タスクが検出されました (平均: ${avgDuration.toFixed(2)}ms)`,
                    suggestion: 'タスクを小さく分割するか、Web Workerの使用を検討してください'
                });
            }
        }

        // メモリ使用量のチェック
        const memoryEntries = this.metrics.get('memory') || [];
        if (memoryEntries.length > 1) {
            const latest = memoryEntries[memoryEntries.length - 1];
            const usagePercent = (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100;
            
            if (usagePercent > 80) {
                recommendations.push({
                    type: 'memory',
                    severity: 'high',
                    message: `メモリ使用量が高くなっています (${usagePercent.toFixed(1)}%)`,
                    suggestion: 'メモリリークの確認とキャッシュのクリーンアップを実行してください'
                });
            }
        }

        // 操作パフォーマンスのチェック
        const operations = this.metrics.get('operations') || [];
        const slowOperations = operations.filter(op => op.duration > 200);
        if (slowOperations.length > operations.length * 0.1) {
            recommendations.push({
                type: 'performance',
                severity: 'medium',
                message: `遅い操作が多く検出されています (${slowOperations.length}/${operations.length})`,
                suggestion: '操作の最適化または非同期処理の導入を検討してください'
            });
        }

        return recommendations;
    }

    /**
     * 特定のメトリクスを取得
     */
    getMetrics(category) {
        return this.metrics.get(category) || [];
    }

    /**
     * 全メトリクスを取得
     */
    getAllMetrics() {
        const result = {};
        for (const [category, entries] of this.metrics.entries()) {
            result[category] = entries;
        }
        return result;
    }

    /**
     * メトリクスをクリア
     */
    clearMetrics(category = null) {
        if (category) {
            this.metrics.delete(category);
        } else {
            this.metrics.clear();
        }
    }

    /**
     * 監視を停止
     */
    stop() {
        this.isEnabled = false;
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }

    /**
     * 監視を再開
     */
    start() {
        this.isEnabled = true;
        this.initializeObservers();
    }

    /**
     * パフォーマンス統計をエクスポート
     */
    exportStats() {
        return {
            startTime: this.startTime,
            uptime: performance.now() - this.startTime,
            metrics: this.getAllMetrics(),
            summary: this.getMetricsSummary(),
            recommendations: this.generateRecommendations(),
            exportedAt: new Date().toISOString()
        };
    }
}