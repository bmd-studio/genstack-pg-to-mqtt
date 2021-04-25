import _ from 'lodash';
import { GenericContainer, Network, StartedNetwork, StartedTestContainer } from 'testcontainers';
import getPort from 'get-port';

import { stopProcess, startProcess } from '../../process';
import { connectDatabase, getPgClient } from '../../database';
import { isTestingContainer } from '../../environment';
import { connectMqtt } from '../../mqtt';

const POSTGRES_INTERNAL_PORT = 5432;
const MQTT_INTERNAL_PORT = 1883;
const HTTP_INTERNAL_PORT = 4000;

const POSTGRES_DOCKER_IMAGE = 'postgres:13.2-alpine';
const MQTT_DOCKER_IMAGE = 'eclipse-mosquitto:1.6.14';
const PG_TO_MQTT_DOCKER_IMAGE = 'pg-to-mqtt:internal';

const APP_PREFIX = 'test';

const POSTGRES_HOST_NAME = '0.0.0.0';
const POSTGRES_DATABASE_NAME = 'test';
const POSTGRES_ADMIN_ROLE_NAME = `admin`;
const POSTGRES_ADMIN_SECRET = 'password';
const POSTGRES_USER = `${APP_PREFIX}_${POSTGRES_ADMIN_ROLE_NAME}`;

const MQTT_HOST_NAME = '0.0.0.0';

export const PROJECT_TABLE_NAME = 'projects';

// The project amount determines the amount of projects seeded in the database,
// but also the amount of database events trigger AT ONCE (the testing query updates all queries).
// This provides a good stress tester for this service to see how fast it can run.
// Note that if you want to stress test with more you likely need to increase the test timeout in your jest config.
export const PROJECT_AMOUNT = parseInt(process?.env?.PROJECT_AMOUNT ?? '10000');

let network: StartedNetwork;
let pgContainer: StartedTestContainer; 
let mqttContainer: StartedTestContainer; 
let pgToMqttContainer: StartedTestContainer;

const setupContainers = async(): Promise<void> => {
  network = await new Network()
    .start();

  pgContainer = await new GenericContainer(POSTGRES_DOCKER_IMAGE)
    .withNetworkMode(network.getName())
    .withExposedPorts(POSTGRES_INTERNAL_PORT)
    .withEnv('POSTGRES_USER', POSTGRES_USER)
    .withEnv('POSTGRES_PASSWORD', POSTGRES_ADMIN_SECRET)
    .withEnv('POSTGRES_DB', POSTGRES_DATABASE_NAME)
    .start();

  mqttContainer = await new GenericContainer(MQTT_DOCKER_IMAGE)
    .withNetworkMode(network.getName())
    .withExposedPorts(MQTT_INTERNAL_PORT)
    .start();

  if (isTestingContainer()) {
    pgToMqttContainer = await new GenericContainer(PG_TO_MQTT_DOCKER_IMAGE)
      .withNetworkMode(network.getName())
      .withExposedPorts(HTTP_INTERNAL_PORT)
      .withEnv('APP_PREFIX', APP_PREFIX)
      .withEnv('DEFAULT_HTTP_PORT', String(HTTP_INTERNAL_PORT))
      .withEnv('POSTGRES_HOST_NAME', pgContainer?.getIpAddress(network.getName()))
      .withEnv('POSTGRES_PORT', String(POSTGRES_INTERNAL_PORT))
      .withEnv('POSTGRES_ADMIN_ROLE_NAME', POSTGRES_ADMIN_ROLE_NAME)
      .withEnv('POSTGRES_ADMIN_SECRET', POSTGRES_ADMIN_SECRET)
      .withEnv('POSTGRES_DATABASE_NAME', POSTGRES_DATABASE_NAME)   
      .withEnv('MQTT_HOST_NAME', mqttContainer?.getIpAddress(network.getName()))
      .withEnv('MQTT_PORT', String(MQTT_INTERNAL_PORT))     
      .start();    
  }
};

const shutdownContainers = async(): Promise<void> => {
  await pgContainer?.stop();
  await mqttContainer?.stop();
  await pgToMqttContainer?.stop();
};

const setupEnv = async (): Promise<void> => {
  _.assignIn(process.env, {
    APP_PREFIX,    
    DEFAULT_HTTP_PORT: await getPort(),

    POSTGRES_HOST_NAME,
    POSTGRES_PORT: pgContainer.getMappedPort(POSTGRES_INTERNAL_PORT).toString(),
    POSTGRES_DATABASE_NAME, 
    POSTGRES_ADMIN_ROLE_NAME,
    POSTGRES_ADMIN_SECRET,

    MQTT_HOST_NAME,
    MQTT_PORT: mqttContainer.getMappedPort(MQTT_INTERNAL_PORT).toString(),
  });
};

const setupDatabase = async (): Promise<void> => {
  const pgClient = getPgClient();
  await pgClient.query(`
    CREATE EXTENSION "uuid-ossp";

    CREATE TABLE ${PROJECT_TABLE_NAME} (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name text
    );

    CREATE FUNCTION notify_row_operation() RETURNS trigger AS $trigger$ 
    BEGIN
      PERFORM pg_notify('${APP_PREFIX}_row_operation', 
        json_build_object(
          'operation', lower(TG_OP),
          'tableName', TG_TABLE_NAME,
          'columnName', 'id',
          'columnValue', NEW.id,
          'rowId', NEW.id
        )::text
      ); 

      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql security definer; 

    CREATE TRIGGER update_of_${PROJECT_TABLE_NAME}
      AFTER UPDATE
      ON ${PROJECT_TABLE_NAME} FOR EACH ROW
    EXECUTE PROCEDURE notify_row_operation();
  `);
  const values = _.join(_.map(_.range(0, PROJECT_AMOUNT), () => {
    return `($1)`;
  }), ',');

  await pgClient.query(`
    INSERT INTO ${PROJECT_TABLE_NAME} (name)
    VALUES ${values};
  `, ['Test Project']);
};

export const setupTestApp = async (): Promise<void> => {
  await setupContainers();
  await setupEnv();

  if (isTestingContainer()) {
    await connectMqtt();
    await connectDatabase();
    await setupDatabase();
  } else {
    await startProcess();
    await setupDatabase();
  }
};

export const shutdownTestApp = async (): Promise<void> => {
  await stopProcess();
  await shutdownContainers();
};