import { saveAs } from 'file-saver';
import type { EmotionAnalysisResult } from '../types/emotion';

// 导出格式类型
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'image';

// 导出配置接口
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeRawData?: boolean;
  dateRange?: [Date, Date];
  compression?: boolean;
}

// 情绪分析数据导出类
export class EmotionAnalysisExporter {
  private data: EmotionAnalysisResult;
  
  constructor(data: EmotionAnalysisResult) {
    this.data = data;
  }

  // 主导出方法
  async export(config: ExportConfig): Promise<void> {
    const filename = config.filename || this.generateFilename(config.format);
    
    try {
      switch (config.format) {
        case 'json':
          await this.exportAsJSON(filename, config);
          break;
        case 'csv':
          await this.exportAsCSV(filename, config);
          break;
        case 'pdf':
          await this.exportAsPDF(filename, config);
          break;
        case 'image':
          await this.exportAsImage(filename, config);
          break;
        default:
          throw new Error(`不支持的导出格式: ${config.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 生成文件名
  private generateFilename(format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const timeRange = this.data.timeRange;
    return `emotion-analysis-${timeRange}-${timestamp}.${format}`;
  }

  // JSON格式导出
  private async exportAsJSON(filename: string, config: ExportConfig): Promise<void> {
    const exportData: any = {
      metadata: {
        exportTime: new Date().toISOString(),
        timeRange: this.data.timeRange,
        dateRange: this.data.dateRange,
        version: '1.0.0'
      }
    };

    if (config.includeSummary !== false) {
      exportData.summary = {
        statistics: this.data.statistics,
        suggestions: this.data.suggestions,
        trends: {
          overallTrend: this.data.trends.overallTrend,
          moodStability: this.data.trends.moodStability,
          positivityRatio: this.data.trends.positivityRatio,
          weeklyComparison: this.data.trends.weeklyComparison
        }
      };
    }

    if (config.includeRawData !== false) {
      exportData.rawData = {
        aggregations: this.data.aggregations,
        timePoints: this.data.trends.timePoints,
        calendar: this.data.calendar,
        knowledgeGraph: this.data.knowledgeGraph
      };
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    
    saveAs(blob, filename);
  }

  // CSV格式导出
  private async exportAsCSV(filename: string, config: ExportConfig): Promise<void> {
    let csvContent = '';
    
    // 情绪聚合数据
    if (config.includeSummary !== false) {
      csvContent += '# 情绪聚合统计\n';
      csvContent += 'emotion,emotion_cn,category,count,total_intensity,average_intensity,percentage,trend\n';
      
      this.data.aggregations.forEach(agg => {
        csvContent += [
          agg.emotion,
          agg.emotion_cn,
          agg.category,
          agg.count,
          agg.totalIntensity.toFixed(2),
          agg.averageIntensity.toFixed(2),
          agg.percentage.toFixed(2),
          agg.trend
        ].join(',') + '\n';
      });
      
      csvContent += '\n';
    }
    
    // 时间序列数据
    if (config.includeRawData !== false) {
      csvContent += '# 时间序列数据\n';
      csvContent += 'date,dominant_emotion,average_intensity,active_emotion_ratio,passive_emotion_ratio,record_count\n';
      
      this.data.trends.timePoints.forEach(point => {
        csvContent += [
          point.date,
          point.dominantEmotion,
          point.averageIntensity.toFixed(2),
          point.activeEmotionRatio.toFixed(2),
          point.passiveEmotionRatio.toFixed(2),
          point.recordCount
        ].join(',') + '\n';
      });
      
      csvContent += '\n';
    }
    
    // 日历数据
    if (this.data.calendar && this.data.calendar.length > 0) {
      csvContent += '# 日历情绪数据\n';
      csvContent += 'date,dominant_emotion,record_count,summary\n';
      
      this.data.calendar.forEach(cal => {
        csvContent += [
          cal.date,
          cal.dominantEmotion,
          cal.recordCount,
          `"${cal.summary || ''}"`
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8'
    });
    
    saveAs(blob, filename);
  }

  // PDF格式导出 (简化实现)
  private async exportAsPDF(_filename: string, config: ExportConfig): Promise<void> {
    // 这里使用简化的HTML to PDF方法
    // 在生产环境中，建议使用专业的PDF库如jsPDF或puppeteer
    const htmlContent = this.generateHTMLReport(config);
    
    // 创建一个隐藏的iframe来打印PDF
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      
      // 触发打印对话框
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 1000);
    }
  }

  // 图片格式导出 (截图功能)
  private async exportAsImage(filename: string, _config: ExportConfig): Promise<void> {
    // 使用html2canvas来截图当前页面
    try {
      const html2canvas = await import('html2canvas');
      const element = document.querySelector('.ant-tabs-content-holder') as HTMLElement;
      
      if (!element) {
        throw new Error('找不到要截图的元素');
      }
      
      const canvas = await html2canvas.default(element, {
        backgroundColor: '#ffffff',
        scale: 2, // 高分辨率
        useCORS: true,
        allowTaint: true
      });
      
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          saveAs(blob, filename.replace(/\.[^/.]+$/, '.png'));
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Image export failed:', error);
      throw new Error('图片导出失败，请确保浏览器支持canvas功能');
    }
  }

  // 生成HTML报告
  private generateHTMLReport(_config: ExportConfig): string {
    const stats = this.data.statistics;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>情绪分析报告</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 40px;
            color: #333;
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1890ff;
          }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 20px; 
            margin: 30px 0;
          }
          .stat-card {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1890ff;
            margin-bottom: 5px;
          }
          .stat-label {
            color: #666;
            font-size: 14px;
          }
          .emotion-list {
            margin: 20px 0;
          }
          .emotion-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .suggestions {
            background: #e6f7ff;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>情绪分析报告</h1>
          <p>分析时间范围: ${this.data.timeRange} | 生成时间: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalRecords}</div>
            <div class="stat-label">总记录数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.averageIntensity.toFixed(1)}</div>
            <div class="stat-label">平均情绪强度</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(stats.positivityRatio * 100).toFixed(1)}%</div>
            <div class="stat-label">积极情绪占比</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(stats.moodStability * 100).toFixed(1)}%</div>
            <div class="stat-label">情绪稳定性</div>
          </div>
        </div>
        
        <h2>情绪分布统计</h2>
        <div class="emotion-list">
          ${this.data.aggregations.map(agg => `
            <div class="emotion-item">
              <span>${agg.emotion_cn}</span>
              <span>${agg.count}次 (${agg.percentage.toFixed(1)}%)</span>
            </div>
          `).join('')}
        </div>
        
        <div class="suggestions">
          <h3>建议与洞察</h3>
          <ul>
            ${this.data.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>
        
        <div class="footer">
          <p>本报告由Ruma情绪分析系统自动生成</p>
        </div>
      </body>
      </html>
    `;
  }
}

// 分享功能类
export class EmotionAnalysisSharer {
  private data: EmotionAnalysisResult;
  
  constructor(data: EmotionAnalysisResult) {
    this.data = data;
  }

  // 生成分享摘要
  generateShareSummary(): string {
    const stats = this.data.statistics;
    const timeRange = this.data.timeRange;
    
    return `我的${timeRange}情绪分析报告：
📊 总记录数: ${stats.totalRecords}
😊 主要情绪: ${this.getEmotionChinese(stats.dominantEmotion)}
📈 积极情绪占比: ${(stats.positivityRatio * 100).toFixed(1)}%
🎯 情绪稳定性: ${(stats.moodStability * 100).toFixed(1)}%
📝 趋势: ${this.getTrendChinese(stats.recentTrend)}

#情绪分析 #心理健康 #Ruma`;
  }

  // 复制到剪贴板
  async copyToClipboard(): Promise<void> {
    const text = this.generateShareSummary();
    
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // 降级方案：使用传统的复制方法
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // 生成分享链接 (需要后端支持)
  async generateShareLink(): Promise<string> {
    // 这里应该调用后端API生成分享链接
    // 目前返回一个模拟的链接
    const shareId = this.generateShareId();
    return `${window.location.origin}/emotion-analysis/share/${shareId}`;
  }

  // 社交媒体分享
  shareToSocial(platform: 'twitter' | 'facebook' | 'weibo'): void {
    const text = this.generateShareSummary();
    const url = window.location.href;
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'weibo':
        shareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }

  // 生成分享ID
  private generateShareId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`;
  }

  // 情绪中文名映射
  private getEmotionChinese(emotion: string): string {
    const emotionMap: Record<string, string> = {
      happiness: '快乐',
      satisfaction: '满足',
      joy: '喜悦',
      hope: '希望',
      excitement: '兴奋',
      confidence: '自信',
      sadness: '悲伤',
      anxiety: '焦虑',
      anger: '愤怒',
      fear: '恐惧',
      confusion: '困惑',
      guilt: '内疚',
      neutral: '中性'
    };
    return emotionMap[emotion] || emotion;
  }

  // 趋势中文名映射
  private getTrendChinese(trend: string): string {
    const trendMap: Record<string, string> = {
      improving: '改善中',
      declining: '下降中',
      stable: '保持稳定'
    };
    return trendMap[trend] || trend;
  }
}

// 导出工具函数
export const exportEmotionAnalysis = async (
  data: EmotionAnalysisResult, 
  config: ExportConfig
): Promise<void> => {
  const exporter = new EmotionAnalysisExporter(data);
  await exporter.export(config);
};

export const shareEmotionAnalysis = (data: EmotionAnalysisResult) => {
  return new EmotionAnalysisSharer(data);
}; 