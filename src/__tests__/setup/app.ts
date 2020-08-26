import _ from 'lodash';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import getPort from 'get-port';

import { stopProcess, startProcess } from '../../process';
import { getPgClient } from '../../database';

const POSTGRES_INTERNAL_PORT = 5432;
const MQTT_INTERNAL_PORT = 1883;

const POSTGRES_DOCKER_IMAGE = 'postgres';
const POSTGRES_DOCKER_TAG = '11.5-alpine';
const MQTT_DOCKER_IMAGE = 'eclipse-mosquitto';
const MQTT_DOCKER_TAG = '1.6.9';

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

let pgContainer: StartedTestContainer; 
let mqttContainer: StartedTestContainer; 

const setupTestContainers = async(): Promise<void> => {
  pgContainer = await new GenericContainer(POSTGRES_DOCKER_IMAGE, POSTGRES_DOCKER_TAG)
    .withExposedPorts(POSTGRES_INTERNAL_PORT)
    .withEnv('POSTGRES_USER', POSTGRES_USER)
    .withEnv('POSTGRES_PASSWORD', POSTGRES_ADMIN_SECRET)
    .withEnv('POSTGRES_DB', POSTGRES_DATABASE_NAME)
    .start();

  mqttContainer = await new GenericContainer(MQTT_DOCKER_IMAGE, MQTT_DOCKER_TAG)
    .withExposedPorts(MQTT_INTERNAL_PORT)
    .start(); 
};

const shutdownTestContainers = async(): Promise<void> => {
  await pgContainer.stop();
  await mqttContainer.stop();
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
  await setupTestContainers();
  await setupEnv();
  await startProcess(async () => {
    await setupDatabase();
  });
};

export const shutdownTestApp = async (): Promise<void> => {
  await stopProcess();
  await shutdownTestContainers();
};