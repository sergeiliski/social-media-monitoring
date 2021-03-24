import SocialMediaMonitor from '../src/index.js'
import Facebook from '../src/facebook.js';
import Helper from '../src/helper.js';


test('SMM constructor', () => {
  const smm = new SocialMediaMonitor()
  expect(smm).not.toBeNull()
});

test('Database connection', async () => {
  const config = Helper.getSimpleDatabaseConfigs()
  const smm = new SocialMediaMonitor(config)
  await smm.connect()
  const connection = smm.getConnection()
  await connection.schema.dropTable(Helper.getTableName())
  smm.destroyConnection()
  expect(connection).not.toBeNull()
});

test('Table exists', async () => {
  const config = Helper.getSimpleDatabaseConfigs()
  const smm = new SocialMediaMonitor(config)
  await smm.connect()
  const connection = smm.getConnection()
  const exists = await connection.schema.hasTable(Helper.getTableName())
  await connection.schema.dropTable(Helper.getTableName())
  smm.destroyConnection()
  expect(exists).toBeTruthy()
});

test('Facebook getMessages() returns not null', async () => {
  const pages = Helper.getFacebookPages()
  const fb = new Facebook({ pages: pages})
  const messages = await fb.getMessages()
  expect(messages).not.toBeNull()
});

test('SMM getMessages() returns not null', async () => {
  const pages = Helper.getFacebookPages()
  const config = { facebook: pages }
  const smm = new SocialMediaMonitor(config)
  const messages = await smm.getMessages()
  expect(messages).not.toBeNull()
});

test('Facebook direct reply returns not null', async () => {
  const pages = Helper.getFacebookPages()
  const config = { facebook: pages }
  const smm = new SocialMediaMonitor(config)
  const message = {
    message: 'Lorem Ipsum',
    channel: 'facebook',
    message_type: 'feed',
    page_id: '',
    thread_id: ''
  }
  const response = await smm.reply(message)
  expect(response).not.toBeNull()
});

test('Facebook feed reply returns not null', async () => {
  const pages = Helper.getFacebookPages()
  const config = { facebook: pages }
  const smm = new SocialMediaMonitor(config)
  const message = {
    message: 'test feed message',
    channel: 'facebook',
    message_type: 'feed',
    page_id: '',
    thread_id: ''
  }
  const response = await smm.reply(message)
  expect(response).not.toBeNull()
});