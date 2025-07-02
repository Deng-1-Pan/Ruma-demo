import React, { useState } from 'react';
import { 
  Modal, 
  Tabs, 
  Button, 
  Select, 
  Checkbox, 
  Input, 
  Space, 
  message, 
  Card,
  Typography,
  Row,
  Col,
  Divider,
  Tooltip
} from 'antd';
import { 
  DownloadOutlined, 
  ShareAltOutlined, 
  CopyOutlined,
  TwitterOutlined,
  WechatOutlined,
  LinkOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import type { EmotionAnalysisResult } from '../../types/emotion';
import { exportEmotionAnalysis, shareEmotionAnalysis, type ExportFormat, type ExportConfig } from '../../utils/exportUtils';
import { useResponsive, getComponentResponsiveConfig } from '../../utils/responsiveUtils';

const { TabPane } = Tabs;
const { Text } = Typography;
const { Option } = Select;

interface ExportShareDialogProps {
  visible: boolean;
  onClose: () => void;
  data: EmotionAnalysisResult | null;
}

const ExportShareDialog: React.FC<ExportShareDialogProps> = ({
  visible,
  onClose,
  data
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'share'>('export');
  
  // 响应式设计Hook
  const { isMobile } = useResponsive();
  const componentConfig = getComponentResponsiveConfig(isMobile ? 'mobile' : 'desktop');
  
  // 导出配置状态
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [customFilename, setCustomFilename] = useState('');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(true);

  // 处理导出
  const handleExport = async () => {
    if (!data) {
      message.error('暂无数据可导出');
      return;
    }

    setLoading(true);
    
    try {
      const config: ExportConfig = {
        format: exportFormat,
        filename: customFilename || undefined,
        includeCharts,
        includeSummary,
        includeRawData
      };
      
      await exportEmotionAnalysis(data, config);
      message.success(`导出${getFormatName(exportFormat)}成功！`);
      onClose();
      
    } catch (error) {
      console.error('Export failed:', error);
      message.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理分享
  const handleShare = async (method: 'copy' | 'link' | 'twitter' | 'weibo') => {
    if (!data) {
      message.error('暂无数据可分享');
      return;
    }

    setLoading(true);
    
    try {
      const sharer = shareEmotionAnalysis(data);
      
      switch (method) {
        case 'copy':
          await sharer.copyToClipboard();
          message.success('分享内容已复制到剪贴板！');
          break;
          
        case 'link':
          const shareLink = await sharer.generateShareLink();
          await navigator.clipboard.writeText(shareLink);
          message.success('分享链接已复制到剪贴板！');
          break;
          
        case 'twitter':
          sharer.shareToSocial('twitter');
          message.info('正在打开Twitter分享页面...');
          break;
          
        case 'weibo':
          sharer.shareToSocial('weibo');
          message.info('正在打开微博分享页面...');
          break;
      }
      
    } catch (error) {
      console.error('Share failed:', error);
      message.error(`分享失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取格式显示名称
  const getFormatName = (format: ExportFormat): string => {
    const formatNames = {
      json: 'JSON数据',
      csv: 'CSV表格',
      pdf: 'PDF报告',
      image: '图片截图'
    };
    return formatNames[format];
  };

  // 获取格式图标
  const getFormatIcon = (format: ExportFormat) => {
    const icons = {
      json: <FileTextOutlined />,
      csv: <FileExcelOutlined />,
      pdf: <FilePdfOutlined />,
      image: <FileImageOutlined />
    };
    return icons[format];
  };

  // 获取预览内容
  const getPreviewContent = () => {
    if (!data) return '暂无数据预览';
    
    const stats = data.statistics;
    return `${data.timeRange}情绪分析报告：
📊 总记录数: ${stats.totalRecords}
😊 主要情绪: ${stats.dominantEmotion}
📈 积极情绪占比: ${(stats.positivityRatio * 100).toFixed(1)}%
🎯 情绪稳定性: ${(stats.moodStability * 100).toFixed(1)}%`;
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeTab === 'export' ? <DownloadOutlined /> : <ShareAltOutlined />}
          <span>
            {activeTab === 'export' ? 
              (isMobile ? '导出' : '导出数据') : 
              (isMobile ? '分享' : '分享报告')
            }
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={componentConfig.modal.width}
      style={{ top: componentConfig.modal.top }}
      centered={componentConfig.modal.centered}
    >
              <Tabs activeKey={activeTab} onChange={setActiveTab as any} size={isMobile ? 'small' : 'middle'}>
          {/* 导出标签页 */}
          <TabPane tab={isMobile ? "📥 导出" : "📥 导出数据"} key="export">
            <div style={{ padding: isMobile ? '12px 0' : '16px 0' }}>
                             <Row gutter={isMobile ? 12 : 24}>
                <Col xs={24} sm={12}>
                  <Card title="导出设置" size="small">
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text strong>导出格式</Text>
                      <Select
                        value={exportFormat}
                        onChange={setExportFormat}
                        style={{ width: '100%', marginTop: 8 }}
                        size="middle"
                      >
                        <Option value="json">
                          <Space>
                            <FileTextOutlined />
                            <span>JSON - 完整数据</span>
                          </Space>
                        </Option>
                        <Option value="csv">
                          <Space>
                            <FileExcelOutlined />
                            <span>CSV - 表格数据</span>
                          </Space>
                        </Option>
                        <Option value="pdf">
                          <Space>
                            <FilePdfOutlined />
                            <span>PDF - 报告文档</span>
                          </Space>
                        </Option>
                        <Option value="image">
                          <Space>
                            <FileImageOutlined />
                            <span>PNG - 图片截图</span>
                          </Space>
                        </Option>
                      </Select>
                    </div>

                    <div>
                      <Text strong>自定义文件名</Text>
                      <Input
                        placeholder="留空使用默认文件名"
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        style={{ marginTop: 8 }}
                      />
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <div>
                      <Text strong>导出内容</Text>
                      <div style={{ marginTop: 8 }}>
                        <Checkbox
                          checked={includeSummary}
                          onChange={(e) => setIncludeSummary(e.target.checked)}
                        >
                          包含分析摘要
                        </Checkbox>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Checkbox
                          checked={includeRawData}
                          onChange={(e) => setIncludeRawData(e.target.checked)}
                        >
                          包含原始数据
                        </Checkbox>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Checkbox
                          checked={includeCharts}
                          onChange={(e) => setIncludeCharts(e.target.checked)}
                          disabled={exportFormat !== 'pdf' && exportFormat !== 'image'}
                        >
                          包含图表 (仅PDF/图片)
                        </Checkbox>
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>

                             <Col xs={24} sm={12}>
                 <Card title="格式说明" size="small">
                  <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    {exportFormat === 'json' && (
                      <div>
                        <Text strong>JSON格式特点：</Text>
                        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                          <li>完整的数据结构</li>
                          <li>便于程序处理</li>
                          <li>包含元数据信息</li>
                          <li>支持重新导入分析</li>
                        </ul>
                      </div>
                    )}
                    
                    {exportFormat === 'csv' && (
                      <div>
                        <Text strong>CSV格式特点：</Text>
                        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                          <li>Excel兼容格式</li>
                          <li>便于数据分析</li>
                          <li>支持数据透视表</li>
                          <li>文件体积较小</li>
                        </ul>
                      </div>
                    )}
                    
                    {exportFormat === 'pdf' && (
                      <div>
                        <Text strong>PDF格式特点：</Text>
                        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                          <li>专业报告格式</li>
                          <li>便于打印分享</li>
                          <li>包含统计图表</li>
                          <li>格式固定美观</li>
                        </ul>
                      </div>
                    )}
                    
                    {exportFormat === 'image' && (
                      <div>
                        <Text strong>图片格式特点：</Text>
                        <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                          <li>高分辨率截图</li>
                          <li>便于社交分享</li>
                          <li>所见即所得</li>
                          <li>支持移动设备</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button
                type="primary"
                size="large"
                icon={getFormatIcon(exportFormat)}
                loading={loading}
                onClick={handleExport}
                style={{ minWidth: 160 }}
              >
                导出 {getFormatName(exportFormat)}
              </Button>
            </div>
          </div>
        </TabPane>

                  {/* 分享标签页 */}
          <TabPane tab={isMobile ? "🔗 分享" : "🔗 分享报告"} key="share">
            <div style={{ padding: isMobile ? '12px 0' : '16px 0' }}>
              <Row gutter={isMobile ? 12 : 24}>
                <Col xs={24} sm={12}>
                  <Card title="分享预览" size="small">
                                      <div 
                      style={{ 
                        backgroundColor: '#f5f5f5',
                        padding: isMobile ? '8px' : '12px',
                        borderRadius: '6px',
                        fontSize: isMobile ? '11px' : '12px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-line',
                        minHeight: isMobile ? '100px' : '120px'
                      }}
                    >
                      {getPreviewContent()}
                    </div>
                </Card>
              </Col>

                              <Col xs={24} sm={12}>
                  <Card title="分享方式" size="small">
                                      <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}>
                      <Tooltip title={isMobile ? "复制内容" : "复制分享文本到剪贴板"}>
                        <Button
                          block
                          icon={<CopyOutlined />}
                          onClick={() => handleShare('copy')}
                          loading={loading}
                          size={isMobile ? 'small' : 'middle'}
                        >
                          {isMobile ? "复制内容" : "复制分享内容"}
                        </Button>
                      </Tooltip>

                      <Tooltip title={isMobile ? "生成链接" : "生成可访问的分享链接"}>
                        <Button
                          block
                          icon={<LinkOutlined />}
                          onClick={() => handleShare('link')}
                          loading={loading}
                          size={isMobile ? 'small' : 'middle'}
                        >
                          {isMobile ? "生成链接" : "生成分享链接"}
                        </Button>
                      </Tooltip>

                      <Divider style={{ margin: isMobile ? '6px 0' : '8px 0' }}>
                        {isMobile ? "社交" : "社交媒体"}
                      </Divider>

                      <Button
                        block
                        icon={<TwitterOutlined />}
                        onClick={() => handleShare('twitter')}
                        loading={loading}
                        size={isMobile ? 'small' : 'middle'}
                        style={{ backgroundColor: '#1da1f2', borderColor: '#1da1f2', color: 'white' }}
                      >
                        {isMobile ? "Twitter" : "分享到 Twitter"}
                      </Button>

                      <Button
                        block
                        icon={<WechatOutlined />}
                        onClick={() => handleShare('weibo')}
                        loading={loading}
                        size={isMobile ? 'small' : 'middle'}
                        style={{ backgroundColor: '#e6162d', borderColor: '#e6162d', color: 'white' }}
                      >
                        {isMobile ? "微博" : "分享到微博"}
                      </Button>
                    </Space>
                </Card>
              </Col>
            </Row>

                          <div style={{ marginTop: isMobile ? 16 : 24 }}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>
                    💡 {isMobile ? '提示' : '分享小贴士'}：
                    <br />
                    • {isMobile ? '复制内容可粘贴到任意平台' : '复制内容可直接粘贴到任意平台'}
                    <br />
                    • {isMobile ? '分享链接允许他人查看结果' : '分享链接允许他人查看您的分析结果'}
                    <br />
                    • {isMobile ? '社交媒体分享自动打开平台' : '社交媒体分享会自动打开对应平台'}
                    <br />
                    • {isMobile ? '分享内容不含敏感信息' : '分享内容不包含敏感的个人信息'}
                  </Text>
                </Card>
              </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ExportShareDialog; 