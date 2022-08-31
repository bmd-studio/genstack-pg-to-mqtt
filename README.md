# genstack-pg-to-mqtt
[![Test](https://github.com/bmd-studio/genstack-pg-to-mqtt/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/bmd-studio/genstack-pg-to-mqtt/actions/workflows/test.yml)

PostgreSQL event listener to MQTT container for genstack.

## Debugging
The `DEBUG` environment variable is used for debugging using the `pg-to-mqtt` namespace.

To enable info logs:
```
DEBUG=pg-to-mqtt:info
```

To enable errors:
```
DEBUG=pg-to-mqtt:error
```

To enable all:
```
DEBUG=pg-to-mqtt:*
```
