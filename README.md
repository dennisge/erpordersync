# ERP Order Sync

ERP Order Sync is an open-source Chrome and Microsoft Edge extension for extracting order data from ERP pages and synchronizing it to a third-party HTTP API.

This project is released under the [MIT License](./LICENSE).

中文说明见 [README.zh-CN.md](./README.zh-CN.md).

## Features

- Extract order rows from the current ERP page table.
- Support configurable table selectors and ERP URL matching rules.
- Map ERP column names to normalized API fields.
- Send orders in batch mode or single-record mode.
- Configure API URL, token, custom headers, and field mappings.
- Enable debug logging and inspect logs inside the extension, without relying on the target page console.

## Project Structure

- `manifest.json`: extension manifest for Chrome / Edge.
- `content.js`: scrapes order data from the ERP page DOM.
- `background.js`: handles settings, sync requests, and debug log storage.
- `popup.html` + `popup.js`: quick actions for scraping and syncing.
- `options.html` + `options.js`: extension configuration page.
- `logs.html` + `logs.js`: dedicated debug log viewer.
- `styles.css`: shared UI styles.
- `assets/icons/`: publish-ready extension icons.
- `assets/branding/`: editable brand assets.
- `docs/`: store listing and policy templates.

## Install Locally

1. Open `chrome://extensions/` in Chrome or `edge://extensions/` in Microsoft Edge.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select this project directory.

## Configuration

Open the extension options page and set:

- `API URL`: the third-party endpoint that receives orders.
- `API Token`: optional bearer token.
- `ERP URL Patterns`: optional allowlist, one pattern per line.
- `Table Selector`: CSS selector for the ERP order table.
- `Sync Mode`: `batch` or `single`.
- `Debug Logging`: `on` or `off`.
- `Extra Headers`: JSON object with additional request headers.
- `Field Mappings`: JSON object that maps ERP headers to normalized fields.

Example field mapping:

```json
{
  "orderNo": ["Order No", "order_no", "订单号", "单号"],
  "customerName": ["Customer Name", "客户名称", "客户"],
  "amount": ["Amount", "Total Amount", "金额", "总金额"],
  "status": ["Status", "订单状态", "状态"],
  "createdAt": ["Created At", "下单时间", "创建时间"]
}
```

## Sync Payload

Batch mode:

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

Single mode:

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

## Publishing Notes

- Chrome Web Store and Microsoft Edge Add-ons both require raster icons; the required extension icons are included in `assets/icons/`.
- Before publishing, review the permissions in `manifest.json` and narrow host permissions to your ERP domains if possible.
- For store submissions, prepare screenshots and host a public privacy policy page based on the templates in `docs/`.

See:

- [docs/STORE_LISTING.en.md](./docs/STORE_LISTING.en.md)
- [docs/STORE_LISTING.zh-CN.md](./docs/STORE_LISTING.zh-CN.md)
- [docs/PRIVACY.en.md](./docs/PRIVACY.en.md)
- [docs/PRIVACY.zh-CN.md](./docs/PRIVACY.zh-CN.md)

## Repository

- GitHub: [dennisge/erpordersync](https://github.com/dennisge/erpordersync)
