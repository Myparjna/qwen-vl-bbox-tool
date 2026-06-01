# Qwen VL BBox 标注工具

基于阿里云百炼 Qwen VL 模型的图片目标检测标注工具。

## 功能特性

- 拖拽/点击/粘贴上传图片
- 调用 Qwen3.5-Flash / Qwen3.6-plus 自动检测目标
- BBox 坐标实时可视化绘制
- 检测结果列表 + 悬停高亮
- 预览/下载标注图片
- 最近 6 次检测记录 (localStorage)
- 密码访问控制
- API 响应时间显示

## 在线体验

https://qwenvl.pages.dev

访问密码: `REDACTED`

## 技术栈

- **前端**: HTML/CSS/JavaScript (单文件)
- **后端**: Cloudflare Pages Functions
- **AI模型**: 阿里云百炼 Qwen VL (qwen3.5-flash / qwen3.6-plus)

## 本地开发

```bash
# 安装依赖
npm install

# 配置 API Key
# 创建 .dev.vars 文件
echo "DASHSCOPE_API_KEY=your_api_key" > .dev.vars

# 启动开发服务器
npm run dev
# 访问 http://127.0.0.1:8788
```

## 部署到 Cloudflare Pages

```bash
# 创建项目
CLOUDFLARE_API_TOKEN=xxx npx wrangler pages project create qwenvl

# 部署
CLOUDFLARE_API_TOKEN=xxx npx wrangler pages deploy public --project-name=qwenvl

# 设置 API Key
CLOUDFLARE_API_TOKEN=xxx npx wrangler pages secret put DASHSCOPE_API_KEY --project-name=qwenvl
```

## 项目结构

```
qwen-vl-bbox-tool/
├── public/
│   ├── index.html      # 前端页面 (含 CSS/JS)
│   └── favicon.png     # 网站图标
├── functions/
│   └── api/
│       └── analyze.js  # 后端 API (代理百炼接口)
├── wrangler.toml       # Cloudflare 配置
├── package.json
└── .dev.vars           # 本地环境变量 (不提交)
```

## 开发说明

本系统由 MiMo v2.5 Pro 配合 Claude Code 以及 oh-my-claudecode (OMC) 开发。

## License

[MIT](LICENSE)
