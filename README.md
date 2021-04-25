# genstack-container-pg-to-mqtt
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/bmd-studio/genstack-container-pg-to-mqtt/test)

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
