# ERP Order Sync

ERP Order Sync 是一个开源的 Chrome / Microsoft Edge 浏览器扩展，用于从 ERP 页面提取订单数据，并同步到第三方 HTTP API。

本项目采用 [MIT License](./LICENSE) 开源。

English documentation: [README.md](./README.md)

## 功能概览

- 从当前 ERP 页面表格中提取订单数据。
- 支持 ERP 页面 URL 匹配规则和表格选择器配置。
- 支持把 ERP 原始列名映射为统一字段。
- 支持批量同步和逐条同步两种模式。
- 支持配置 API 地址、Token、自定义 Header 和字段映射。
- 支持开启调试日志，并在扩展内部查看日志，不依赖目标网页控制台。

## 项目结构

- `manifest.json`：Chrome / Edge 扩展清单。
- `content.js`：ERP 页面 DOM 抓取逻辑。
- `background.js`：配置管理、同步请求和调试日志存储。
- `popup.html` + `popup.js`：抓取和同步快捷入口。
- `options.html` + `options.js`：扩展配置页。
- `logs.html` + `logs.js`：独立日志查看页。
- `styles.css`：共享样式。
- `assets/icons/`：发布用扩展图标。
- `assets/branding/`：可编辑品牌资源。
- `docs/`：商店文案和隐私说明模板。

## 本地安装

1. Chrome 打开 `chrome://extensions/`，或 Edge 打开 `edge://extensions/`
2. 启用“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择当前项目目录

## 配置说明

在扩展配置页中设置：

- `API URL`：接收订单的第三方接口地址
- `API Token`：可选的 Bearer Token
- `ERP 页面 URL 规则`：可选，每行一个匹配规则
- `订单表格选择器`：ERP 订单表格的 CSS Selector
- `同步模式`：`batch` 或 `single`
- `调试日志`：开启或关闭
- `附加请求头`：JSON 格式
- `字段映射`：JSON 格式

字段映射示例：

```json
{
  "orderNo": ["订单号", "单号", "Order No", "order_no"],
  "customerName": ["客户名称", "客户", "Customer Name"],
  "amount": ["金额", "总金额", "Amount"],
  "status": ["状态", "订单状态", "Status"],
  "createdAt": ["下单时间", "创建时间", "Created At"]
}
```

## 同步报文格式

批量模式：

```json
{
  "source": "chrome-extension",
  "sourceUrl": "https://erp.example.com/orders",
  "orderCount": 2,
  "orders": [
    {
      "orderNo": "SO20260414001",
      "customerName": "ACME",
      "amount": "1000.00"
    }
  ]
}
```

单条模式：

```json
{
  "source": "chrome-extension",
  "sourceUrl": "https://erp.example.com/orders",
  "order": {
    "orderNo": "SO20260414001",
    "customerName": "ACME",
    "amount": "1000.00"
  }
}
```

## 本地打包

生成可本地加载的扩展目录和 zip 包：

```bash
rm -rf dist/erpordersync-0.1.0 dist/erpordersync-0.1.0.zip

mkdir -p dist/erpordersync-0.1.0/assets \
  dist/erpordersync-0.1.0/docs \
  dist/erpordersync-0.1.0/_locales

cp manifest.json background.js content.js i18n.js \
  popup.html popup.js options.html options.js logs.html logs.js styles.css \
  README.md README.zh-CN.md LICENSE \
  dist/erpordersync-0.1.0/

cp -R assets/icons assets/branding dist/erpordersync-0.1.0/assets/
cp -R _locales/* dist/erpordersync-0.1.0/_locales/
cp docs/PRIVACY.en.md docs/PRIVACY.zh-CN.md docs/STORE_LISTING.en.md docs/STORE_LISTING.zh-CN.md dist/erpordersync-0.1.0/docs/

cd dist
zip -r erpordersync-0.1.0.zip erpordersync-0.1.0
```

本地加载目录：`dist/erpordersync-0.1.0`。

zip 包位置：`dist/erpordersync-0.1.0.zip`。

## 发布说明

- Chrome Web Store 和 Microsoft Edge Add-ons 都要求使用位图图标，项目已提供 `assets/icons/` 下的发布图标。
- 正式提交前，建议收窄 `manifest.json` 中的站点权限，只保留你的 ERP 域名。
- 商店提审前，仍需要额外准备截图，并把 `docs/` 中的隐私说明模板发布成公开页面。

相关文档：

- [docs/STORE_LISTING.zh-CN.md](./docs/STORE_LISTING.zh-CN.md)
- [docs/STORE_LISTING.en.md](./docs/STORE_LISTING.en.md)
- [docs/PRIVACY.zh-CN.md](./docs/PRIVACY.zh-CN.md)
- [docs/PRIVACY.en.md](./docs/PRIVACY.en.md)

## 仓库地址

- GitHub：[dennisge/erpordersync](https://github.com/dennisge/erpordersync)
