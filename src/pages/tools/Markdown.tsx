import { useState } from 'react';
import { Card, Input, Button, Typography, Space, message, Row, Col, Switch, Divider, Tag } from 'antd';
import { CopyOutlined, FileTextOutlined, EyeOutlined, EditOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

// 示例Markdown内容
const sampleMarkdown = `# Markdown 预览工具

这是一个功能强大的 **Markdown** 预览工具，支持实时预览和多种语法高亮。

## 功能特性

- ✅ 实时预览
- ✅ 语法高亮
- ✅ 支持GitHub风格Markdown
- ✅ 代码块高亮
- ✅ 表格支持
- ✅ 任务列表

## 代码示例

### JavaScript代码
\`\`\`javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 输出: 55
\`\`\`

### Python代码
\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

## 表格示例

| 功能 | 支持状态 | 说明 |
|------|----------|------|
| 标题 | ✅ | 支持1-6级标题 |
| 列表 | ✅ | 有序和无序列表 |
| 链接 | ✅ | 自动识别链接 |
| 图片 | ✅ | 支持图片显示 |
| 表格 | ✅ | 支持复杂表格 |

## 任务列表

- [x] 完成基础功能
- [x] 添加语法高亮
- [x] 支持表格
- [ ] 添加导出功能
- [ ] 支持主题切换

## 引用

> 这是一个引用示例。
> 
> 你可以在引用中包含多行内容，甚至包含其他Markdown元素。

## 链接和图片

[访问GitHub](https://github.com)

![示例图片](https://via.placeholder.com/300x200/13c2c2/ffffff?text=Markdown+Preview)

---

*感谢使用Markdown预览工具！*
`;

export default function MarkdownPreview() {
    // 自动统计页面访问
    useAutoTrackVisit('Markdown预览');

    const [markdown, setMarkdown] = useState(sampleMarkdown);
    const [isLivePreview, setIsLivePreview] = useState(true);
    const [showLineNumbers] = useState(true);

    // 复制Markdown内容
    const handleCopyMarkdown = () => {
        navigator.clipboard.writeText(markdown);
        message.success('Markdown内容已复制到剪贴板');
    };

    // 下载Markdown文件
    const handleDownloadMarkdown = () => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success('Markdown文件已下载');
    };

    // 清空内容
    const handleClear = () => {
        setMarkdown('');
        message.info('内容已清空');
    };

    // 加载示例
    const handleLoadSample = () => {
        setMarkdown(sampleMarkdown);
        message.success('已加载示例内容');
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* 页面标题 */}
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <Title level={2}>
                    <FileTextOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                    Markdown 预览工具
                </Title>
                <Paragraph type="secondary">
                    支持GitHub风格Markdown，实时预览，语法高亮
                </Paragraph>
            </div>

            {/* 工具栏 */}
            <Card size="small" style={{ marginBottom: '16px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space>
                            <Tag color="blue">GitHub Flavored Markdown</Tag>
                            <Tag color="green">语法高亮</Tag>
                            <Tag color="orange">实时预览</Tag>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <span>实时预览:</span>
                            <Switch
                                checked={isLivePreview}
                                onChange={setIsLivePreview}
                                checkedChildren="开"
                                unCheckedChildren="关"
                            />
                            <Divider type="vertical" />
                            <Button
                                icon={<EditOutlined />}
                                onClick={handleLoadSample}
                                type="default"
                            >
                                加载示例
                            </Button>
                            <Button
                                icon={<CopyOutlined />}
                                onClick={handleCopyMarkdown}
                                type="primary"
                            >
                                复制Markdown
                            </Button>
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={handleDownloadMarkdown}
                                type="default"
                            >
                                下载
                            </Button>
                            <Button
                                icon={<ClearOutlined />}
                                onClick={handleClear}
                                danger
                            >
                                清空
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* 编辑和预览区域 */}
            <Row gutter={16}>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <EditOutlined />
                                Markdown编辑器
                                <Tag color="processing">编辑中</Tag>
                            </Space>
                        }
                        size="small"
                    >
                        <TextArea
                            value={markdown}
                            onChange={(e) => setMarkdown(e.target.value)}
                            placeholder="在这里输入Markdown内容..."
                            rows={25}
                            style={{
                                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                fontSize: '14px',
                                border: 'none',
                                resize: 'none'
                            }}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <Space>
                                <EyeOutlined />
                                预览效果
                                <Tag color="success">实时预览</Tag>
                            </Space>
                        }
                        size="small"
                    >
                        <div
                            style={{
                                minHeight: '500px',
                                maxHeight: '500px',
                                overflow: 'auto',
                                padding: '16px',
                                backgroundColor: '#fff',
                                borderRadius: '6px'
                            }}
                        >
                            {markdown ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        code(props: any) {
                                            const { inline, className, children, ...rest } = props;
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <SyntaxHighlighter
                                                    style={oneDark}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    showLineNumbers={showLineNumbers}
                                                    {...rest}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            ) : (
                                                <code
                                                    style={{
                                                        backgroundColor: '#f6f8fa',
                                                        padding: '2px 4px',
                                                        borderRadius: '3px',
                                                        fontSize: '0.9em'
                                                    }}
                                                    className={className}
                                                    {...rest}
                                                >
                                                    {children}
                                                </code>
                                            );
                                        },
                                        // 自定义表格样式
                                        table(props: any) {
                                            const { children, ...rest } = props;
                                            return (
                                                <table
                                                    style={{
                                                        borderCollapse: 'collapse',
                                                        width: '100%',
                                                        marginBottom: '16px'
                                                    }}
                                                    {...rest}
                                                >
                                                    {children}
                                                </table>
                                            );
                                        },
                                        th(props: any) {
                                            const { children, ...rest } = props;
                                            return (
                                                <th
                                                    style={{
                                                        border: '1px solid #d9d9d9',
                                                        padding: '8px 12px',
                                                        backgroundColor: '#fafafa',
                                                        textAlign: 'left'
                                                    }}
                                                    {...rest}
                                                >
                                                    {children}
                                                </th>
                                            );
                                        },
                                        td(props: any) {
                                            const { children, ...rest } = props;
                                            return (
                                                <td
                                                    style={{
                                                        border: '1px solid #d9d9d9',
                                                        padding: '8px 12px'
                                                    }}
                                                    {...rest}
                                                >
                                                    {children}
                                                </td>
                                            );
                                        }
                                    }}
                                >
                                    {markdown}
                                </ReactMarkdown>
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    color: '#999',
                                    padding: '60px 20px'
                                }}>
                                    <EyeOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                                    <div>在左侧输入Markdown内容，这里将显示预览效果</div>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 使用说明 */}
            <Card size="small" style={{ marginTop: '16px' }}>
                <Title level={4}>使用说明</Title>
                <Row gutter={16}>
                    <Col span={8}>
                        <Paragraph strong>基础语法</Paragraph>
                        <ul>
                            <li><code># 标题</code> - 一级标题</li>
                            <li><code>## 标题</code> - 二级标题</li>
                            <li><code>**粗体**</code> - 粗体文本</li>
                            <li><code>*斜体*</code> - 斜体文本</li>
                            <li><code>`代码`</code> - 行内代码</li>
                        </ul>
                    </Col>
                    <Col span={8}>
                        <Paragraph strong>高级功能</Paragraph>
                        <ul>
                            <li><code>[链接](url)</code> - 链接</li>
                            <li><code>![图片](url)</code> - 图片</li>
                            <li><code>```代码```</code> - 代码块</li>
                            <li><code>{'>'} 引用</code> - 引用文本</li>
                            <li><code>- 列表项</code> - 无序列表</li>
                        </ul>
                    </Col>
                    <Col span={8}>
                        <Paragraph strong>扩展语法</Paragraph>
                        <ul>
                            <li><code>| 表格 | 支持 |</code> - 表格</li>
                            <li><code>- [x] 任务</code> - 任务列表</li>
                            <li><code>~~删除线~~</code> - 删除线</li>
                            <li><code>==高亮==</code> - 高亮文本</li>
                            <li><code>脚注[^1]</code> - 脚注</li>
                        </ul>
                    </Col>
                </Row>
            </Card>
        </div>
    );
}