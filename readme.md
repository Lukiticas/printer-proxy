elgin-printer-proxy/
├── package.json
├── server.js
├── src/
│   ├── printer-manager.js
│   ├── endpoints/
│   │   ├── available.js
│   │   ├── default.js
│   │   ├── read.js
│   │   └── write.js
│   └── utils/
│       ├── printer-discovery.js
│       └── raw-sender.js
├── service/
│   ├── install-service.js
│   └── uninstall-service.js
├── config/
│   └── printer-config.json
└── dist/ (for executable builds)