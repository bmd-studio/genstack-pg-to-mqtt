import _, { isEmpty } from 'lodash';
import mqtt from 'mqtt';
import * as changeCase from 'change-case';
import { QoS } from 'mqtt-packet';

import { getPgListener, getPgClient } from './database';
import { getMqttClient } from './mqtt';
import environment from './environment';
import { PgEvent } from './index';
import logger from './logger';

const {
  POSTGRES_IDENTITY_SECRET_COLUMN_NAME,
  POSTGRES_HIDDEN_COLUMN_NAMES,

  DATABASE_ID_COLUMN_NAME,

  MQTT_DEFAULT_QOS,
  MQTT_DATABASE_CHANNEL_PREFIX,
  MQTT_MAX_TOPIC_LEVEL_LENGTH,
  MQTT_DATABASE_RESOURCE_INFLECTOR_ENABLED,  
} = environment.env;

const getHiddenColumnNames = (): string[] => {
  return _.concat(
    _.split(POSTGRES_HIDDEN_COLUMN_NAMES, ','), 
    [POSTGRES_IDENTITY_SECRET_COLUMN_NAME]
  );
};

const formatMqttMessage = (message: object): string => {
  const hiddenColumnNames = getHiddenColumnNames();

  // make all keys camel case to be in line with GraphQL
  if (MQTT_DATABASE_RESOURCE_INFLECTOR_ENABLED) {
    message = _.mapKeys(message, (_value, key) => {
      return changeCase.camelCase(key);
    });
  }

  // remove hidden fields
  _.map(hiddenColumnNames, (hiddenColumnName) => {
    delete message[hiddenColumnName];
  });

  // convert to string
  return JSON.stringify(message);
};

const constructMqttTopic = (topicParts: string[]): string => {
  return _.join(_.map(topicParts, (topicPart) => {

    // make all keys snake-case to be in line with GraphQL
    if (MQTT_DATABASE_RESOURCE_INFLECTOR_ENABLED) {
      
      // only replace underscores and capitalize the next character!
      // this allows uuids for example to stay intact            
      topicPart = changeCase.camelCase(topicPart, { 
        stripRegexp: /[_]+/g,
      });
    }

    return topicPart;
  }), '/');  
};

export const startListening = async(): Promise<void> => {
  const {
    APP_PREFIX,
  } = environment.env;
  const pgListener = getPgListener();
  const mqttClient = getMqttClient();
  const pgClient = getPgClient();
  const rowOperationChannel = `${APP_PREFIX}_row_operation`;

  if (!mqttClient) {
    throw Error(`The MQTT client is not properly initialized!`);
  }

  // listen to the row operation channel
  pgListener.on(rowOperationChannel, async (pgEvent: PgEvent) => {
    const pgPayload = pgEvent.payload;

    // guard: check if the payload is valid
    if (!_.isObject(pgPayload)) {
      logger.error(`An invalid payload was received and therefore skipped:`);
      logger.error(pgPayload);
      return;
    }

    logger.verbose(`Row operation event received with payload:`);
    logger.verbose(pgPayload);

    // deconstruct to create MQTT channel
    const { operation, tableName, rowId, columnName, columnValue } = pgPayload;

    // attempt to get the record through a direct Postgres connection
    // this is quicker than using another type of API
    let queryResult = undefined;
    const query = `SELECT * FROM ${tableName} WHERE ${DATABASE_ID_COLUMN_NAME} = $1 LIMIT 1;`;

    try {
      queryResult = await pgClient.query({
        text: query,
        values: [rowId],
      });
    } catch(error) {
      logger.error(`An error occurred when getting the record from the database before broadcasting:`);
      logger.error(error);
      return;
    }

    const row = queryResult?.rows?.[0];   
    let mqttMessage = row; 
    const mqttTopicParts = [MQTT_DATABASE_CHANNEL_PREFIX, operation, tableName, columnName];

    // check if the column value should be included in the MQTT channel
    if (_.isString(columnValue) && columnValue.length < MQTT_MAX_TOPIC_LEVEL_LENGTH) {
      mqttTopicParts.push(columnValue);
    }

    // construct the channel
    const mqttTopic = constructMqttTopic(mqttTopicParts); 

    // make sure there is a payload
    if (isEmpty(mqttMessage)) {
      mqttMessage = {
        [DATABASE_ID_COLUMN_NAME]: rowId,
      };
    }

    // make sure the payload is a string
    if (_.isObject(mqttMessage)) {
      mqttMessage = formatMqttMessage(mqttMessage);
    }

    logger.verbose(`Sending out an MQTT message on channel ${mqttTopic} with message:`);
    logger.verbose(mqttMessage);

    // send the payload to the broker
    const publishOptions: mqtt.IClientPublishOptions = { 
      qos: MQTT_DEFAULT_QOS as QoS,
    };

    mqttClient.publish(mqttTopic, mqttMessage, publishOptions);
  });

  return new Promise((resolve) => {

    // confirm that we're listening to channels
    pgListener.on('listen', (channel: string) => {

      // guard: skip other channels in this listener
      if (rowOperationChannel !== rowOperationChannel) {
        return;
      }

      logger.info(`Listening to the database for notifications on channel "${channel}".`);
      resolve();
    });
  });
};