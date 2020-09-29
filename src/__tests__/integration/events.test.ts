import _ from 'lodash';

import { setupTestApp, shutdownTestApp, PROJECT_TABLE_NAME, PROJECT_AMOUNT } from '../setup/app';
import { getMqttClient } from '../../mqtt';
import environment from '../../environment';
import { getPgClient } from '../../database';

const {
  MQTT_DATABASE_CHANNEL_PREFIX
} = environment.env;

describe('events', () => {
  beforeAll(async () => {
    await setupTestApp();
  });
  afterAll(async () => {
    await shutdownTestApp();
  });

  it('should send and receive MQTT event', async () => {
    const testTopic = 'test/test';
    const testPayload = {
      value: 'test-payload',
    };
    const mqttClient = getMqttClient();

    // wrap in promise because the MQTT client works with callbacks
    return new Promise((resolve) => {
      mqttClient.on('message', (topic: string, payload: string) => {
        const parsedPayload = JSON.parse(payload.toString());
  
        // skip other topics
        // this allows other tests to run in parallel in the future
        if (topic !== testTopic) {
          return;
        }

        expect(parsedPayload).toEqual(testPayload);
        resolve();
      });
      mqttClient.subscribe(testTopic, () => {
        mqttClient.publish(testTopic, JSON.stringify(testPayload));
      });      
    });
  });
  
  it('should update projects in database and receive MQTT events', async () => {
    const topic = `${MQTT_DATABASE_CHANNEL_PREFIX}/update/${PROJECT_TABLE_NAME}/#`;
    const mqttClient = getMqttClient();
    const pgClient = getPgClient();

    // wait until the mqtt client is subscribed
    await new Promise((resolve) => {
      mqttClient.subscribe(topic, async() => {
        resolve();
      });
    });

    return new Promise((resolve) => {
      let currentCounter = 0;
      const targetCounter = PROJECT_AMOUNT;
      const verifyCounter = _.debounce(() => {
        expect(currentCounter).toBe(targetCounter);
        resolve();
      }, 1000);

      // initialize the client event listener
      mqttClient.on('message', (topic: string) => {

        // guard: skip non pg related events
        if (!_.startsWith(topic, MQTT_DATABASE_CHANNEL_PREFIX)) {
          return;
        }

        currentCounter ++;
        verifyCounter();
      });

      pgClient.query(`
        UPDATE ${PROJECT_TABLE_NAME}
        SET name = 'adjusted';
      `, (_error, result) => {
        expect(result.rowCount).toBe(PROJECT_AMOUNT);   
      });
    });
  });
});