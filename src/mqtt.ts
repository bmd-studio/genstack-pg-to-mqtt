import mqtt, { MqttClient } from 'mqtt';

import environment from './environment';
import { reboot } from './process';
import logger from './logger';

let mqttClient: MqttClient | undefined;

const errorHandler = (error: Error): void => {
  logger.error(`An error occurred with the MQTT connection:`);
  logger.error(error);
  reboot();
};

export const getMqttClient = () => {
  return mqttClient;
};

export const connectMqtt = async (): Promise<void> => {
  // include the constants here to allow test environments to change it before connecting
  const {
    MQTT_HOST_NAME,
    MQTT_PORT,
    MQTT_ADMIN_USERNAME,
    MQTT_ADMIN_SECRET,
  } = environment.env;
  const mqttUrl = `mqtt://${MQTT_HOST_NAME}:${MQTT_PORT}`;

  logger.info(`Attempting to connect to MQTT at ${mqttUrl}.`);

  // initialize MQTT client
  mqttClient = mqtt.connect(mqttUrl, {
    username: MQTT_ADMIN_USERNAME,
    password: MQTT_ADMIN_SECRET,
    connectTimeout: 30 * 1000,
    reconnectPeriod: 1000,
  });

  // handle MQTT errors
  mqttClient.on('error', errorHandler);
  // mqttClient.on('offline', errorHandler);
  // mqttClient.on('end', errorHandler);
  // mqttClient.on('disconnect', errorHandler);
  // mqttClient.on('close', errorHandler);

  return new Promise((resolve, reject) => {
    if (!mqttClient) {
      reject(`The MQTT client is not properly initialized!`);
      return;
    }

    mqttClient.on('connect', () => {
      logger.info(`Successfully connected to MQTT at ${mqttUrl}.`);
      resolve();
    });
  }); 
};

export const disconnectMqtt = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!mqttClient) {
      reject(`The MQTT client is not properly initialized!`);
      return;
    }

    mqttClient.end(false, {}, () => {
      resolve();
    });
  });
};