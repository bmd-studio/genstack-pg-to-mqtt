import dotenvParseVariables from 'dotenv-parse-variables';

const parseEnv = (envUnparsed: any) => {
  return dotenvParseVariables(envUnparsed, {
    assignToProcessEnv: false,
    overrideProcessEnv: false,
  });
};

export default {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get env() {
    const parsedProcessEnv = parseEnv(process.env);

    return {
      APP_PREFIX: 'project', 
      DEBUG: 'pg-to-mqtt:error,pg-to-mqtt:info',
      DEBUG_NAMESPACE: 'pg-to-mqtt',
      NODE_ENV: 'development',

      DEFAULT_HTTP_PORT: 4000,

      POSTGRES_HOST_NAME: 'postgresql',
      POSTGRES_PORT: '5432',
      POSTGRES_DATABASE_NAME: 'proj',
      POSTGRES_ADMIN_ROLE_NAME: 'admin',
      POSTGRES_ADMIN_SECRET: 'password',
      
      POSTGRES_IDENTITY_SECRET_COLUMN_NAME: 'secret',
      POSTGRES_HIDDEN_COLUMN_NAMES: 'secret,password',

      DATABASE_ID_COLUMN_NAME: 'id',

      MQTT_HOST_NAME: 'vernemq',
      MQTT_PORT: 1883,
      MQTT_DEFAULT_QOS: 1,
      MQTT_DATABASE_CHANNEL_PREFIX: 'pg',
      MQTT_MAX_TOPIC_LEVEL_LENGTH: 255,
      MQTT_DATABASE_RESOURCE_INFLECTOR_ENABLED: true,  
      MQTT_ADMIN_USERNAME: 'admin',
      MQTT_ADMIN_SECRET: 'password',

      HEALTHCHECK_PATH: '/healthcheck',

      ...parsedProcessEnv,
    };
  },
};