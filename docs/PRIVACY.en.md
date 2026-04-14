# Privacy Policy Draft

## Overview

ERP Order Sync is designed for internal business use. The extension reads order data from user-accessible ERP web pages and sends the selected data to a third-party API configured by the user or organization.

## Data Processed

The extension may process:

- Order numbers
- Customer names
- Order amounts
- Order statuses
- Order timestamps
- Other visible ERP table columns configured by the user

## How Data Is Used

The extension uses the data only to:

- Extract order information from the current ERP page
- Transform the data according to user-defined field mappings
- Send the data to the configured third-party API
- Store local debug logs inside the extension when debug logging is enabled

## Data Storage

- Extension settings are stored in browser extension storage.
- Debug logs are stored locally in browser extension storage when enabled.
- The extension does not ship with a built-in external analytics service.

## Data Sharing

Data is sent only to the API endpoint configured by the user or organization.

## User Control

Users can:

- Change or remove the API endpoint
- Disable debug logging
- Clear locally stored debug logs
- Uninstall the extension to remove its local storage

## Contact

GitHub repository: [https://github.com/dennisge/erpordersync](https://github.com/dennisge/erpordersync)
